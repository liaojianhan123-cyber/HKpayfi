import { useEffect, useState } from "react";
import { ethers } from "ethers";

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export default function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<number | null>(null);

  useEffect(() => {
    if (!window.ethereum) return;

    // Rehydrate on mount: if user already authorized this site before, pick
    // up the current account + chain WITHOUT prompting again. Fixes the
    // "Connect shows my address but network is wrong" loop in MetaMask 11+.
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
        }
        const net = await provider.getNetwork();
        setNetwork(Number(net.chainId));
      } catch {
        // No prior connection — leave state null until user clicks Connect
      }
    })();

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

  /** Ask MetaMask to switch this dApp to Sepolia. Adds Sepolia first if it
   *  isn't already in the user's network list. */
  const switchToSepolia = async () => {
    if (!window.ethereum) {
      alert("MetaMask not installed");
      return;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: "Sepolia",
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://ethereum-sepolia.publicnode.com"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        console.error("Failed to switch to Sepolia", err);
      }
    }
  };

  return {
    account,
    network,
    connectWallet,
    switchToSepolia,
    isSepolia: network === SEPOLIA_CHAIN_ID,
  };
}
