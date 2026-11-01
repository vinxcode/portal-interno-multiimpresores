'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { clientSchema } from '@/lib/schemas/client';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Client } from '@/lib/types/database';

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}

export function ClientFormModal({ open, onClose, onCreated }: ClientFormModalProps) {
  const router = useRouter();
  const [docId, setDocId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);

    const parsed = clientSchema.safeParse({
      docId: docId.trim(),
      name: name.trim(),
      phone: phone.trim() === '' ? undefined : phone.trim(),
      email: email.trim() === '' ? undefined : email.trim(),
    });

    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('clients')
        .insert({
          doc_id: parsed.data.docId,
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
          email: parsed.data.email ?? null,
        })
        .select()
        .single();

      if (error) {
        setErrors([error.message]);
        return;
      }

      const created = data as unknown as Client;
      onCreated(created);
      router.refresh();
      setDocId('');
      setName('');
      setPhone('');
      setEmail('');
      onClose();
    } catch {
      setErrors(['No se pudo crear el cliente. Intente de nuevo.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Nuevo Cliente" onClose={loading ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="NIT / NRC / DUI" htmlFor="client-doc">
          <Input
            id="client-doc"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            disabled={loading}
            placeholder="0614-120214-101-2"
          />
        </Field>
        <Field label="Nombre del cliente" htmlFor="client-name">
          <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono" htmlFor="client-phone">
            <Input
              id="client-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              placeholder="2261-8890"
            />
          </Field>
          <Field label="Correo" htmlFor="client-email">
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </Field>
        </div>

        {errors.length > 0 ? (
          <div className="rounded-md bg-red-50 px-3 py-2" role="alert">
            {errors.map((message) => (
              <p key={message} className="text-xs font-medium text-red-700">
                {message}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear Cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
}
