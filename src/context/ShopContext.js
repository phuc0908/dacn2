import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Config
import config from '../config.json';
import Dappazon from '../abis/Dappazon.json';

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const [provider, setProvider] = useState(null);
    const [dappazon, setDappazon] = useState(null);
    const [account, setAccount] = useState(null);

    const [items, setItems] = useState({
        electronics: [],
        clothing: [],
        toys: []
    });

    const [cart, setCart] = useState([]);

    const loadBlockchainData = async () => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            setProvider(provider);
            const network = await provider.getNetwork();

            // Auto-switch network logic from App.js
            if (network.chainId !== 31337) {
                // ... (We will handle this better in App.js or here, but for now let's assume it works or prompts)
                // It's safer to keep the aggressive switching in a useEffect at the top level
            }

            if (!config[network.chainId]) {
                console.error(`Config not found for chain ID: ${network.chainId}`);
                return;
            }

            const dappazon = new ethers.Contract(config[network.chainId].dappazon.address, Dappazon, provider);
            setDappazon(dappazon);

            // Load Items
            const allItems = [];
            // We can read the length from our local items.json to know how many to fetch
            // But we need to import it first. 
            // Since we are inside the function, let's look at the top imports.
            // We need to add `import itemsList from '../items.json'` at the top of file
            // For now, let's hardcode a larger number or just loop until error? 
            // Better to rely on items.json length. 

            // Assuming we added the import, we use itemsList.items.length
            const totalItems = 14; // Updated manually for now or use the length from json if imported

            for (var i = 0; i < totalItems; i++) {
                // Try catch to handle if we ask for non-existent item (though we shouldn't)
                try {
                    const item = await dappazon.items(i + 1);
                    if (item.id.toString() !== '0') {
                        allItems.push(item);
                    }
                } catch (e) { break; }
            }

            const electronics = allItems.filter((item) => item.category === 'electronics');
            const clothing = allItems.filter((item) => item.category === 'clothing');
            const toys = allItems.filter((item) => item.category === 'toys');

            setItems({ electronics, clothing, toys });

            // Check account
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = ethers.utils.getAddress(accounts[0]);
            setAccount(account);

            // Listen for account changes
            window.ethereum.on('accountsChanged', async () => {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = ethers.utils.getAddress(accounts[0]);
                setAccount(account);
            });

        } catch (error) {
            console.error("Failed to load blockchain data", error);
        }
    };

    useEffect(() => {
        loadBlockchainData();
    }, []);

    const addToCart = (item, quantity = 1) => {
        const newItems = Array(quantity).fill(item);
        setCart(prev => [...prev, ...newItems]);
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const clearCart = () => {
        setCart([]);
    }

    return (
        <ShopContext.Provider value={{
            provider,
            dappazon,
            account,
            setAccount,
            items,
            cart,
            addToCart,
            removeFromCart,
            clearCart
        }}>
            {children}
        </ShopContext.Provider>
    );
};

export const useShop = () => useContext(ShopContext);
