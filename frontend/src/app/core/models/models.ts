// Roles — .NET enum serializado como PascalCase string
export type Rol = 'Operadora' | 'Profesional' | 'Secretario';

export interface Usuario {
  id: number; username: string; nombre: string; apellido: string; rol: Rol;
  profesionalId?: number; categoriaId?: number; categoriaNombre?: string;
}
export interface LoginResponse { token: string; tipo: string; usuario: Usuario; }
export interface Categoria { id: number; nombre: string; descripcion?: string; }
export interface Profesional {
  id: number; nombre: string; apellido: string; nombreCompleto: string;
  matricula: string; activo: boolean; usuarioId: number; username: string;
  categoria: { id: number; nombre: string; };
}
export interface CrearProfesionalRequest {
  nombre: string; apellido: string; matricula: string; categoriaId: number;
  username: string; password: string;
}
export interface Turno {
  id: number; fechaHora: string; estado: 'Activo' | 'Cancelado';
  descripcionProblema?: string; createdAt: string; canceladoAt?: string;
  categoria: { id: number; nombre: string; };
  profesional: { id: number; nombre: string; apellido: string; nombreCompleto: string; matricula: string; };
  paciente: { id: number; nombre: string; apellido: string; nombreCompleto: string; dni: string; telefono: string; };
  creadoPor?: string; canceladoPor?: string;
}
export interface CrearTurnoRequest {
  profesionalId: number; categoriaId: number; fechaHora: string;
  paciente: { nombre: string; apellido: string; dni: string; telefono: string; };
  descripcionProblema?: string;
}
export interface SlotHorario {
  hora: string; turnosOcupados: number; cuposDisponibles: number;
  profesionalesLibres: { id: number; nombre: string; apellido: string; nombreCompleto: string; matricula: string; }[];
}
export interface Disponibilidad {
  fecha: string; categoriaId: number; categoriaNombre: string; slots: SlotHorario[];
}
export interface Estadisticas {
  totalActivos: number; totalCancelados: number; totalGeneral: number;
  tasaAsistencia: number; tasaCancelacion: number;
  porCategoria: CategoriaStats[]; porFranja: FranjaStats[];
}
export interface CategoriaStats { categoria: string; cantidad: number; porcentaje: number; }
export interface FranjaStats    { hora: string; cantidad: number; ocupacionPct: number; }
export interface ProfesionalLibre { id: number; nombre: string; apellido: string; nombreCompleto: string; matricula: string; }
export interface ApiError { error: string; mensaje: string; detalles?: Record<string, string>; timestamp: string; }
