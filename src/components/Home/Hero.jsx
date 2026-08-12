import React from "react";
import { Link } from "react-router-dom";
import { useTmTr } from "../../contexts/TmTrContext";
import Button from "../UI/Button";
import { Rocket, Shield, Globe, Zap } from "lucide-react";

/**
 * HeroSection - Landing page hero with modern aesthetics
 */
const HeroSection = () => {
  const { tr } = useTmTr();

  return (
    <section className="relative overflow-hidden py-20 px-6 flex flex-col items-center text-center">
      {/* Background Decorative Elements - Removed to avoid opacity violations */}

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 border border-border text-xs font-bold text-primary mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
        V.2.0 DISPONIBLE
      </div>

      {/* Main Heading */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-tight">
        <span className="text-on-background">Potencia tu Negocio con</span>
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          Inteligencia Artificial
        </span>
      </h1>

      {/* Subtext */}
      <p className="text-xl text-on-surface2 mb-10 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        Gestión inteligente, seguridad de grado militar y una interfaz de usuario
        premium diseñada para la eficiencia. Alkim IA es el motor de tu éxito.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <Link to="/register">
          <Button variant="primary" size="xl" rounded="full" leftIcon={<Rocket size={20} />}>
            Empezar Ahora
          </Button>
        </Link>
        <Link to="/muestra">
          <Button variant="ghost" size="xl" rounded="full">
            Ver Demo
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
        <FeatureCard
          icon={<Zap className="text-warning" />}
          title="Alta Velocidad"
          desc="Optimizado para respuestas instantáneas y carga rápida."
        />
        <FeatureCard
          icon={<Shield className="text-success" />}
          title="Máxima Seguridad"
          desc="Encriptación de datos y protocolos de seguridad avanzada."
        />
        <FeatureCard
          icon={<Globe className="text-primary" />}
          title="Multi-idioma"
          desc="Soporte nativo para múltiples lenguajes y regiones."
        />
        <FeatureCard
          icon={<Rocket className="text-secondary" />}
          title="Escalable"
          desc="Crece junto a tus necesidades sin complicaciones."
        />
      </div>
    </section>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-6 rounded-2xl bg-surface1 border border-border hover:border-primary transition-all hover:translate-y-[-4px] hover:shadow-xl hover:shadow-shadow group text-left">
    <div className="w-12 h-12 rounded-xl bg-surface2 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-lg font-bold mb-2 text-on-surface1">{title}</h3>
    <p className="text-sm text-on-surface2 leading-relaxed">{desc}</p>
  </div>
);

export default HeroSection;
