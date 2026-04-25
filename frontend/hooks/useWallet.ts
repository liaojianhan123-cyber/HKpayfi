import { useState } from "react";
import { ethers } from "ethers";

export default function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<number | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not installed");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();

    setAccount(accounts[0]);
    setNetwork(Number(network.chainId)); // 
  };

  return {
    account,
    network,
    connectWallet,
  };
}