import Cookies from 'js-cookie';

const TOKEN_KEY = 'admin_token';
const REFRESH_KEY = 'admin_refresh';

export const auth = {
  getToken(): string | undefined {
    return Cookies.get(TOKEN_KEY);
  },
  getRefreshToken(): string | undefined {
    return Cookies.get(REFRESH_KEY);
  },
  setToken(token: string, refreshToken: string) {
    Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: 'lax' });
    Cookies.set(REFRESH_KEY, refreshToken, { expires: 30, sameSite: 'lax' });
  },
  clear() {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_KEY);
  },
  isLoggedIn(): boolean {
    return !!Cookies.get(TOKEN_KEY);
  },
};
