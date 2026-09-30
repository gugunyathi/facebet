"""FastAPI gateway that supervises the FaceBet Node/Express engine and proxies /api (HTTP + WebSocket) to it."""
import asyncio
import os
import subprocess
from contextlib import asynccontextmanager, suppress
from pathlib import Path

import httpx
import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from starlette.websockets import WebSocketState

ROOT_DIR = Path(__file__).parent
APP_DIR = ROOT_DIR.parent
load_dotenv(ROOT_DIR / ".env")

NODE_PORT = int(os.environ["NODE_PORT"])
NODE_HTTP = f"http://127.0.0.1:{NODE_PORT}"
NODE_WS = f"ws://127.0.0.1:{NODE_PORT}"
HOP_HEADERS = {
    "host", "content-length", "transfer-encoding", "connection",
    "keep-alive", "upgrade", "content-encoding",
}

node_proc: subprocess.Popen | None = None


def start_node():
    subprocess.run(["fuser", "-k", f"{NODE_PORT}/tcp"], capture_output=True)
    env = {**os.environ, "PORT": str(NODE_PORT), "MONGODB_URI": os.environ["MONGO_URL"], "NODE_ENV": "api"}
    return subprocess.Popen(
        [str(APP_DIR / "node_modules" / ".bin" / "tsx"), "watch", "--clear-screen=false", "--include", "server/**/*.ts", "server/index.ts"],
        cwd=str(APP_DIR),
        env=env,
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global node_proc
    node_proc = start_node()
    app.state.client = httpx.AsyncClient(base_url=NODE_HTTP, timeout=httpx.Timeout(120.0))
    yield
    await app.state.client.aclose()
    if node_proc and node_proc.poll() is None:
        node_proc.terminate()
        try:
            node_proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            node_proc.kill()


app = FastAPI(lifespan=lifespan)


async def _safe_upstream_connect(url: str, retries: int = 3, delay: float = 0.4):
    """Attempt upstream WebSocket connect with a short retry window so mid-handshake
    disconnects during Node restart or ephemeral TCP resets don't drop the client."""
    last_err: Exception | None = None
    for _ in range(retries):
        try:
            return await websockets.connect(url, max_size=16 * 1024 * 1024, ping_interval=20, ping_timeout=20, close_timeout=5)
        except (OSError, websockets.InvalidHandshake, ConnectionResetError) as err:
            last_err = err
            await asyncio.sleep(delay)
    if last_err:
        raise last_err
    raise ConnectionError("Upstream connect failed")


@app.websocket("/api/ws")
async def ws_proxy(client_ws: WebSocket):
    await client_ws.accept()
    upstream = None
    try:
        upstream = await _safe_upstream_connect(f"{NODE_WS}/api/ws")

        async def client_to_upstream():
            try:
                while True:
                    if client_ws.client_state != WebSocketState.CONNECTED:
                        return
                    msg = await client_ws.receive()
                    if msg.get("type") == "websocket.disconnect":
                        return
                    if msg.get("text") is not None:
                        with suppress(websockets.ConnectionClosed, ConnectionResetError):
                            await upstream.send(msg["text"])
                    elif msg.get("bytes") is not None:
                        with suppress(websockets.ConnectionClosed, ConnectionResetError):
                            await upstream.send(msg["bytes"])
            except (WebSocketDisconnect, RuntimeError):
                return
            except Exception as e:
                # Never propagate — matchmaking must not drop siblings.
                print(f"[ws-proxy] client→upstream ended: {type(e).__name__}: {e}")
                return

        async def upstream_to_client():
            try:
                async for data in upstream:
                    if client_ws.client_state != WebSocketState.CONNECTED:
                        return
                    with suppress(WebSocketDisconnect, RuntimeError):
                        if isinstance(data, bytes):
                            await client_ws.send_bytes(data)
                        else:
                            await client_ws.send_text(data)
            except (websockets.ConnectionClosed, RuntimeError):
                return
            except Exception as e:
                print(f"[ws-proxy] upstream→client ended: {type(e).__name__}: {e}")
                return

        tasks = [
            asyncio.create_task(client_to_upstream()),
            asyncio.create_task(upstream_to_client()),
        ]
        _, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await t
    except (WebSocketDisconnect, websockets.ConnectionClosed, OSError, ConnectionError) as e:
        print(f"[ws-proxy] session ended cleanly: {type(e).__name__}")
    except Exception as e:
        print(f"[ws-proxy] unexpected: {type(e).__name__}: {e}")
    finally:
        if upstream is not None:
            with suppress(Exception):
                await upstream.close()
        with suppress(RuntimeError, Exception):
            if client_ws.client_state == WebSocketState.CONNECTED:
                await client_ws.close()


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def http_proxy(path: str, request: Request):
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_HEADERS}
    body = await request.body()
    try:
        upstream = await app.state.client.request(
            request.method, f"/{path}", params=request.query_params, content=body, headers=headers
        )
    except httpx.ConnectError:
        return Response('{"error":"Game engine is starting, retry shortly."}', status_code=503, media_type="application/json")
    out_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP_HEADERS}
    return Response(content=upstream.content, status_code=upstream.status_code, headers=out_headers)
