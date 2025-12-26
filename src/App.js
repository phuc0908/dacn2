import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useShop, ShopProvider } from './context/ShopContext';
import { ethers } from 'ethers';

// Components
import Navigation from './components/Navigation';
import Chatbot from './components/Chatbot';

// Pages
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import History from './pages/History';
import Admin from './pages/Admin';

function AppContent() {
  const { account, setAccount, dappazon } = useShop();  // ← THÊM dappazon

  // Redirect Logic (Keep the network check global)
  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return;
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== 31337) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ethers.utils.hexValue(31337) }],
          });
          window.location.reload();
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: ethers.utils.hexValue(31337),
                  chainName: 'Hardhat Local',
                  rpcUrls: ['http://127.0.0.1:8545'],
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                }],
              });
              window.location.reload();
            } catch (addError) { }
          }
        }
      }
    };
    checkNetwork();
  }, []);

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/history" element={<History />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>

      {/* ← THÊM CHATBOT Ở ĐÂY */}
      <Chatbot dappazon={dappazon} account={account} />
    </div>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <Router>
        <AppContent />
      </Router>
    </ShopProvider>
  );
}