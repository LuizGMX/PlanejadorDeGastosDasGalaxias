import { useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import axios from "axios";

function Payment() {
  const [preferenceId, setPreferenceId] = useState(null);

  initMercadoPago("APP_USR-5cb167a0-d94f-49eb-8eb2-c3b3b22a79a2");

  const createPreference = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/create_preference`,
        {
          title: "Produto Exemplo",
          quantity: 1,
          price: 100,
        }
      );
      const { id } = response.data;
      setPreferenceId(id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBuy = async () => {
    await createPreference();
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Checkout Pro com Mercado Pago</h1>
      <button onClick={handleBuy}>Comprar</button>
      {preferenceId && (
        <Wallet initialization={{ preferenceId }} />
      )}
    </div>
  );
}

export default Payment;