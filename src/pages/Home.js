import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useShop } from '../context/ShopContext';
import Section from '../components/Section';
import './Home.css';

const Home = () => {
    const { items, account, setAccount, provider, searchQuery } = useShop();
    const { electronics, clothing, toys } = items;
    const navigate = useNavigate();
    const [showWallet, setShowWallet] = useState(false);
    const [balance, setBalance] = useState(null);
    const [category, setCategory] = useState('all'); // all | electronics | clothing | toys
    const [minRating, setMinRating] = useState(0); // 0..5
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sort, setSort] = useState('relevance'); // relevance | price_asc | price_desc | rating_desc

    // We can reuse the togglePop logic or just link to details.
    // For now, let's just show sections. 
    // Since Section component expects togglePop, we might need to adjust it or pass a dummy
    // But better yet, we can modify Section to link to /product/:id

    // Actually, let's keep Section simple. It renders Cards.
    // We need to see how Section uses togglePop.
    // Navigate to product page without reloading
    const togglePop = (item) => {
        const idStr = item?.id?.toString?.() ?? String(item?.id ?? '');
        navigate(`/product/${idStr}`);
    };

    const connectAndToggle = async () => {
        try {
            if (!window.ethereum) return;
            if (!account) {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const addr = ethers.utils.getAddress(accounts[0]);
                setAccount(addr);
            }
            setShowWallet((v) => !v);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Failed to connect wallet', e);
        }
    };

    useEffect(() => {
        const loadBalance = async () => {
            if (!provider || !account) {
                setBalance(null);
                return;
            }
            try {
                const bn = await provider.getBalance(account);
                setBalance(ethers.utils.formatEther(bn));
            } catch (e) {
                setBalance(null);
            }
        };

        loadBalance();
    }, [provider, account]);

    const allItems = [...(electronics || []), ...(clothing || []), ...(toys || [])];
    const q = (searchQuery || '').trim().toLowerCase();
    const isFiltering = q.length > 0 || category !== 'all' || minRating > 0 || inStockOnly || sort !== 'relevance';

    const filtered = allItems
        .filter((it) => {
            if (!it) return false;
            if (category !== 'all' && it.category !== category) return false;
            if (minRating > 0 && Number(it.rating?.toString?.() ?? it.rating) < minRating) return false;
            if (inStockOnly && Number(it.stock?.toString?.() ?? it.stock) <= 0) return false;
            if (!q) return true;
            const name = (it.name || '').toLowerCase();
            const cat = (it.category || '').toLowerCase();
            const id = (it.id?.toString?.() ?? '').toLowerCase();
            return name.includes(q) || cat.includes(q) || id === q;
        })
        .sort((a, b) => {
            const costA = a?.cost ?? ethers.constants.Zero;
            const costB = b?.cost ?? ethers.constants.Zero;
            const ratingA = Number(a?.rating?.toString?.() ?? a?.rating ?? 0);
            const ratingB = Number(b?.rating?.toString?.() ?? b?.rating ?? 0);

            // NOTE: BigNumber values are wei (e.g. 1 ETH = 1e18) so we must NOT use toNumber()
            // for comparisons (it overflows). Use lt/gt/eq instead.
            if (sort === 'price_asc') {
                if (costA.eq(costB)) return 0;
                return costA.lt(costB) ? -1 : 1;
            }
            if (sort === 'price_desc') {
                if (costA.eq(costB)) return 0;
                return costA.gt(costB) ? -1 : 1;
            }
            if (sort === 'rating_desc') return ratingB - ratingA;
            return 0;
        });

    return (
        <div>
            <h2>Dappazon Best Sellers</h2>

            <div className="home__filters">
                <button type="button" className="home__btn" onClick={connectAndToggle}>
                    {account ? 'Ví & Số dư' : 'Kết nối ví'}
                </button>

                {showWallet && account && (
                    <div className="home__chip">
                        <span style={{ fontWeight: 900 }}>Account:</span>
                        <span style={{ fontFamily: 'monospace' }}>
                            {account.slice(0, 6)}...{account.slice(-4)}
                        </span>
                        <span style={{ opacity: 0.6 }}>•</span>
                        <span style={{ fontWeight: 900 }}>Balance:</span>
                        <span>{balance ? `${Number(balance).toFixed(4)} ETH` : '...'}</span>
                    </div>
                )}

                <label>
                    Category&nbsp;
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="all">All</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="toys">Toys</option>
                    </select>
                </label>

                <label>
                    Min rating&nbsp;
                    <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                        <option value={0}>Any</option>
                        <option value={1}>1+</option>
                        <option value={2}>2+</option>
                        <option value={3}>3+</option>
                        <option value={4}>4+</option>
                        <option value={5}>5</option>
                    </select>
                </label>

                <label className="home__toggle">
                    <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    In stock
                </label>

                <label>
                    Sort&nbsp;
                    <select value={sort} onChange={(e) => setSort(e.target.value)}>
                        <option value="relevance">Relevance</option>
                        <option value="price_asc">Price ↑</option>
                        <option value="price_desc">Price ↓</option>
                        <option value="rating_desc">Rating ↓</option>
                    </select>
                </label>

                {isFiltering && (
                    <div className="home__meta">
                        Results: {filtered.length}
                    </div>
                )}
            </div>

            {electronics && clothing && toys && (
                <>
                    {isFiltering ? (
                        <Section title={q ? `Results for "${searchQuery}"` : "Results"} items={filtered} togglePop={togglePop} />
                    ) : (
                        <>
                            <Section title={"Clothing & Jewelry"} items={clothing} togglePop={togglePop} />
                            <Section title={"Electronics & Gadgets"} items={electronics} togglePop={togglePop} />
                            <Section title={"Toys & Gaming"} items={toys} togglePop={togglePop} />
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default Home;
