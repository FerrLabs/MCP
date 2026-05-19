import { AsyncLocalStorage } from 'node:async_hooks';

interface AuthContext {
  bearerToken?: string;
}

export const authContext = new AsyncLocalStorage<AuthContext>();

export function runWithAuthContext<T>(ctx: AuthContext, fn: () => Promise<T>): Promise<T> {
  return authContext.run(ctx, fn);
}

export function getRequestBearerToken(): string | undefined {
  return authContext.getStore()?.bearerToken;
}
