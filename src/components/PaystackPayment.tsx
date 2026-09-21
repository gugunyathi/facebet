import React, { useState } from 'react';

interface PaystackProps {
  userId: string;
  emailAddress: string;
}

export const PaystackPayment: React.FC<PaystackProps> = ({ userId, emailAddress }) => {
  const [loading, setLoading] = useState(false);

  const triggerCardCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress, amountInCents: 100, userId: userId }) // $1.00 Entry Pack
      });

      const resData = await response.json();
      if (resData.status && resData.data?.authorization_url) {
        // Redirect browser cleanly to the secure hosted Paystack multi-channel payment interface portal
        window.location.href = resData.data.authorization_url;
      } else {
        alert("Failed to build Paystack channel pipeline gateway.");
      }
    } catch (error) {
      console.error("Paystack transaction initializer error loop:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#ff8c00' }}>💳 Direct Debit Card / Mobile App Checkout</h4>
      <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 12px 0' }}>No cryptocurrency wallet required. Transact smoothly via safe local banking rails.</p>
      <button 
        onClick={triggerCardCheckout}
        disabled={loading}
        style={{ width: '100%', background: '#3bb75e', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? "Opening Secure Payment Tunnel..." : "Pay $1.00 with Card"}
      </button>
    </div>
  );
};

export default PaystackPayment;
