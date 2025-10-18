import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';

export const config = createConfig({
  chains: [base],
  connectors: [],
  transports: {
    [base.id]: http()
  }
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
