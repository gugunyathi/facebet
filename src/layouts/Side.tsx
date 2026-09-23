import { VideoPlayer } from "@/features/main/components/VideoPlayer";
import React from "react";

interface SideProps {
  videoRef: any;
  children?: React.ReactNode;
  className?: string;
  isLocal?: boolean;
  stream?: any;
}

export const Side: React.FC<SideProps> = ({
  videoRef,
  children,
  className = "",
  isLocal = true,
  stream = null,
}) => {
  return (
    <div className={`relative flex-1 w-full md:w-1/2 h-1/2 md:h-full overflow-hidden ${className}`}>
      <VideoPlayer videoRef={videoRef} stream={stream} isLocal={isLocal} muted={isLocal} />
      <div className="w-full h-full top-0 left-0 absolute z-10">
        {children}
      </div>
    </div>
  );
};
