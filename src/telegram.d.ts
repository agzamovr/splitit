interface TelegramWebApp {
  expand(): void;
  ready(): void;
  setHeaderColor(color: "bg_color" | "secondary_bg_color" | string): void;
  setBackgroundColor(color: "bg_color" | "secondary_bg_color" | string): void;
  setBottomBarColor(color: "bg_color" | "secondary_bg_color" | string): void;
  isVersionAtLeast(version: string): boolean;
  colorScheme: "light" | "dark";
  onEvent(eventType: "themeChanged", eventHandler: () => void): void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
