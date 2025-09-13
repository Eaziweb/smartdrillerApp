export const initializeFlutterwavePayment = (paymentData) => {
  return new Promise((resolve, reject) => {
    if (!window.FlutterwaveCheckout) {
      reject(new Error("Flutterwave script not loaded"))
      return
    }

    window.FlutterwaveCheckout({
      public_key: process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: paymentData.tx_ref,
      amount: paymentData.amount,
      currency: paymentData.currency || "NGN",
      country: paymentData.country || "NG",
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: paymentData.customer.email,
        phone_number: paymentData.customer.phone,
        name: paymentData.customer.name,
      },
      callback: (data) => {
        resolve(data)
      },
      onclose: () => {
        reject(new Error("Payment cancelled"))
      },
      customizations: {
        title: "SmartDrill Subscription",
        description: "Activate your SmartDrill subscription",
        logo: "/logo192.png",
      },
    })
  })
}

export const verifyPayment = async (transactionId) => {
  try {
    const response = await fetch("/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({ transactionId }),
    })

    return await response.json()
  } catch (error) {
    console.error("Payment verification failed:", error)
    return { success: false, message: "Verification failed" }
  }
}
