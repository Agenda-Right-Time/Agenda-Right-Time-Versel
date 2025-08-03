
import { Crown } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-8 sm:py-12 px-4 border-t border-gray-800">
      <div className="container mx-auto text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-gold-500" />
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
            Agenda Right Time
          </span>
        </div>
        <p className="text-gray-400 text-sm sm:text-base">
          © 2024 Agenda Right Time. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
