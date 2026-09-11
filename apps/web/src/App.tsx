import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SesionProvider } from './estado/sesion.contexto';
import { AppRutas } from './rutas';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SesionProvider>
          <AppRutas />
        </SesionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
