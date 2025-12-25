import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import Section from '../components/Section';

const Home = () => {
    const { items } = useShop();
    const { electronics, clothing, toys } = items;
    const navigate = useNavigate();

    // We can reuse the togglePop logic or just link to details.
    // For now, let's just show sections. 
    // Since Section component expects togglePop, we might need to adjust it or pass a dummy
    // But better yet, we can modify Section to link to /product/:id

    // Actually, let's keep Section simple. It renders Cards.
    // We need to see how Section uses togglePop.
    // Navigate to product page without reloading
    const togglePop = (item) => {
        navigate(`/product/${item.id}`);
    };

    return (
        <div>
            <h2>Dappazon Best Sellers</h2>
            {electronics && clothing && toys && (
                <>
                    <Section title={"Clothing & Jewelry"} items={clothing} togglePop={togglePop} />
                    <Section title={"Electronics & Gadgets"} items={electronics} togglePop={togglePop} />
                    <Section title={"Toys & Gaming"} items={toys} togglePop={togglePop} />
                </>
            )}
        </div>
    );
}

export default Home;
