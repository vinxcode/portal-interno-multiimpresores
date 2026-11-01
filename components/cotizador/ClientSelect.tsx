'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Field';
import { ClientFormModal } from './ClientFormModal';
import type { Client } from '@/lib/types/database';

interface ClientSelectProps {
  clients: Client[];
  value: string | null;
  onChange: (clientId: string | null) => void;
  canManageClients: boolean;
}

export function ClientSelect({ clients, value, onChange, canManageClients }: ClientSelectProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const selected = clients.find((client) => client.id === value) ?? null;

  return (
    <div className="space-y-2">
      <Field label="Cliente" htmlFor="client-id">
        <div className="flex items-center gap-2">
          <Select
            id="client-id"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">Seleccione un cliente...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          {canManageClients ? (
            <Button type="button" variant="secondary" onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4" aria-hidden />
              Nuevo
            </Button>
          ) : null}
        </div>
      </Field>

      {selected ? (
        <p className="text-xs text-brand-muted">
          NIT/NRC/DUI: <span className="font-medium text-brand-dark">{selected.doc_id}</span>
          {selected.phone ? (
            <>
              {' '}
              - Tel: <span className="font-medium text-brand-dark">{selected.phone}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <ClientFormModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(client) => onChange(client.id)} />
    </div>
  );
}
