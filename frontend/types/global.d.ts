interface Window {
  ethereum?: {
    request: (...args: any[]) => Promise<any>;
    on?: (...args: any[]) => void;
    removeListener?: (...args: any[]) => void;
  };
}