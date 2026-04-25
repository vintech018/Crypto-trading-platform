import "../styles/globals.css";

import { CryptoStreamProvider } from "../hooks/useCryptoStream";

export default function App({ Component, pageProps }) {
  return (
    <CryptoStreamProvider>
      <Component {...pageProps} />
    </CryptoStreamProvider>
  );
}
