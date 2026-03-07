interface TelegramWebApp {
  expand(): void;
  ready(): void;
  setHeaderColor(color: "bg_color" | "secondary_bg_color" | string): void;
  setBackgroundColor(color: "bg_color" | "secondary_bg_color" | string): void;
  setBottomBarColor(color: "bg_color" | "secondary_bg_color" | string): void;
  isVersionAtLeast(version: string): boolean;
  colorScheme: "light" | "dark";
  onEvent(eventType: "themeChanged", eventHandler: () => void): void;
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string };
    chat?: { id: number; type: string; title?: string };
    start_param?: string;
  };
  sendData(data: string): void;
  close(): void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
