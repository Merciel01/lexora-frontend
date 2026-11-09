import { Scale } from "lucide-react";
import { Action } from "../components/Layout";
export default function NotFound() {
  return (
    <div className="empty">
      <Scale size={40} />
      <h1>Cette page est introuvable.</h1>
      <p>Retrouvez votre espace de simulation.</p>
      <Action to="/app">Retour à l’accueil</Action>
    </div>
  );
}
