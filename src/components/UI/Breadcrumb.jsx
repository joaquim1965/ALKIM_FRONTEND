import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumb Component
 * @param {Array} items - List of breadcrumb items [{ label: 'Name', path: '/path' }]
 */
const Breadcrumb = ({ items = [] }) => {
    return (
        <nav aria-label="Ruta de navegación" className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-sm font-medium mb-4 animate-in fade-in slide-in-from-top-1">
            <Link 
                to="/consola" 
                className="flex items-center gap-1 text-on-surface2 hover:text-primary transition-colors"
                title="Ir a Inicio"
            >
                <Home size={16} />
                <span>Inicio</span>
            </Link>

            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <ChevronRight size={14} className="text-on-surface2/40" />
                    {index === items.length - 1 || !item.path ? (
                        <span className="text-on-surface1 font-bold">{item.label}</span>
                    ) : (
                        <Link 
                            to={item.path} 
                            className="text-on-surface2 hover:text-primary transition-colors"
                        >
                            {item.label}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
