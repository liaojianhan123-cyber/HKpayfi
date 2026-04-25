import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<number | null>(null);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts?.[0] || null);
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainId = args[0] as string;
      setNetwork(parseInt(chainId, 16));
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not installed");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();

    setAccount(accounts[0]);
    setNetwork(Number(network.chainId));
  };

  return {
    account,
    network,
    connectWallet,
  };
}