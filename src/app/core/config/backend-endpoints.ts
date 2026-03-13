const productionOrigin = 'https://be.sportyfy.in';

function isLocalhost(): boolean {
  const hostname = globalThis.location?.hostname ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function backendBaseUrl(): string {
  return isLocalhost() ? '' : productionOrigin;
}

export function backendHubUrl(path: string): string {
  return `${backendBaseUrl()}${path}`;
}
