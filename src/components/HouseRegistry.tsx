// src/components/HouseRegistry.tsx
import React, { useEffect, useState } from "react";
import { User } from "../types";
import { dbGetAllUsers } from "../services/db";
import { X, Home, Users } from "lucide-react";

interface HouseRegistryProps {
  onClose: () => void;
}

const HouseRegistry: React.FC<HouseRegistryProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Generamos array del 1 al 45
  const houses = Array.from({ length: 45 }, (_, i) => i + 1);

  useEffect(() => {
    const fetch = async () => {
      const allUsers = await dbGetAllUsers();
      setUsers(allUsers);
      setLoading(false);
    };
    fetch();
  }, []);

  // Función para encontrar vecinos de una casa (buscando el número en su dirección)
  const getNeighbors = (houseNum: number) => {
    return users.filter((u) => {
      // Intenta buscar el número exacto "4" o formatos como "4ºA", "Casa 4"
      // Normalizamos a string y buscamos si empieza por el número o contiene el número aislado
      const h = (u.house_number || "").toLowerCase();
      const n = houseNum.toString();
      return (
        h === n ||
        h.startsWith(n + " ") ||
        h.startsWith(n + "º") ||
        h.includes(` ${n} `)
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#FAF7F2] dark:bg-[#202124] border-2 border-wood w-full max-w-5xl rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabecera */}
        <div className="p-4 border-b border-wood/30 bg-wood/5 flex justify-between items-center">
          <h2 className="text-xl font-black text-wood flex items-center gap-2">
            <Home size={24} /> Registro de Propiedades (1-45)
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-wood"
          >
            <X size={24} />
          </button>
        </div>

        {/* Rejilla */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-neutral-100 dark:bg-neutral-900">
          {loading ? (
            <p className="text-center p-10">Cargando censo...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {houses.map((num) => {
                const neighbors = getNeighbors(num);
                const hasPeople = neighbors.length > 0;

                return (
                  <div
                    key={num}
                    className={`relative p-3 rounded-lg border-2 min-h-[100px] flex flex-col ${hasPeople ? "bg-white dark:bg-neutral-800 border-wood/40" : "bg-gray-200 dark:bg-neutral-800/50 border-transparent opacity-70"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-2xl font-black ${hasPeople ? "text-wood" : "text-neutral-400"}`}
                      >
                        {num}
                      </span>
                      {hasPeople && (
                        <Users size={16} className="text-wood/60" />
                      )}
                    </div>

                    <div className="flex-grow space-y-1">
                      {neighbors.slice(0, 4).map((u) => (
                        <div
                          key={u.id}
                          className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate"
                          title={u.full_name}
                        >
                          {u.full_name?.split(" ")[0]}{" "}
                          {u.full_name?.split(" ")[1]?.[0]}.
                        </div>
                      ))}
                      {neighbors.length === 0 && (
                        <span className="text-[10px] text-neutral-400 italic">
                          Sin registro
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HouseRegistry;
