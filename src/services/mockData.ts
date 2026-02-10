import { Incident, User } from '../types';

export const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    username: 'admin',
    email: 'admin@vc38.com', 
    password: '123', 
    role: 'admin', 
    status: 'active',
    full_name: 'Administrador Principal', 
    house_number: 'Oficina', 
    receive_emails: true 
  },
  { 
    id: 'u2', 
    username: 'supervisor',
    email: 'supervisor@vc38.com', 
    password: '123', 
    role: 'supervisor', 
    status: 'active',
    full_name: 'Supervisor Mantenimiento', 
    house_number: 'Taller', 
    receive_emails: true 
  },
  { 
    id: 'u3', 
    username: 'juan.vecino',
    email: 'vecino@vc38.com', 
    password: '123', 
    role: 'user', 
    status: 'active',
    full_name: 'Juan Vecino', 
    house_number: '1º A', 
    receive_emails: false 
  },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'i1',
    title: 'Farola fundida en entrada principal',
    description: 'La tercera farola empezando por la izquierda no enciende por la noche.',
    category: 'Electricidad',
    status: 'pendiente',
    priority: 'media',
    location: 'Entrada Principal',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    user_id: 'u3',
    user_name: 'Juan Vecino',
    user_house: '1º A',
    notes: [],
    attachments: []
  },
  {
    id: 'i2',
    title: 'Filtración de agua en garaje',
    description: 'Hay una mancha de humedad creciendo en la plaza 45.',
    category: 'Fontanería',
    status: 'en_proceso',
    priority: 'alta',
    location: 'Garaje - Sótano 1',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
    user_id: 'u3',
    user_name: 'Juan Vecino',
    user_house: '1º A',
    notes: [
      {
        id: 'n1',
        author_name: 'Supervisor Mantenimiento',
        content: 'Revisado. Parece venir de la bajante general. Llamaremos al fontanero externo.',
        created_at: new Date(Date.now() - 43200000).toISOString()
      }
    ],
    attachments: []
  },
  {
    id: 'i3',
    title: 'Poda de setos jardín piscina',
    description: 'Los setos están invadiendo el camino peatonal.',
    category: 'Jardinería',
    status: 'resuelto',
    priority: 'baja',
    location: 'Jardín Piscina',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    user_id: 'u2',
    user_name: 'Supervisor Mantenimiento',
    user_house: 'Taller',
    attachments: [],
    notes: []
  }
];