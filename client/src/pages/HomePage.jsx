import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import FeaturedProjects from '../components/FeaturedProjects';
import FeaturedCourses from '../components/FeaturedCourses';
import Pricing from '../components/Pricing';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main>
        <Hero />
        <Categories />
        <FeaturedProjects />
        <FeaturedCourses />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
