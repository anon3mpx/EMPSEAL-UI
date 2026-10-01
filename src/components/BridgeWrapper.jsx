import React from 'react';
import WagmiProviderWrapper from '../Wagmi/WagmiProvider';
import { Provider } from 'react-redux';
import store from '../redux/store/store';
import { ToastContainer } from 'react-toastify';

export default function BridgeWrapper({ children }) {
  return (
    <WagmiProviderWrapper appType="bridge">
      <Provider store={store}>
        {children}
        <ToastContainer position="bottom-center" theme="dark" autoClose={5000} />
      </Provider>
    </WagmiProviderWrapper>
  );
}