"use client";

import { useState } from "react";

/** Make/model inputs with NHTSA suggestions, so spellings stay consistent. */
export function FitmentInputs({ makes }: { makes: string[] }) {
  const [models, setModels] = useState<string[]>([]);

  async function loadModels(make: string) {
    if (!make || !makes.includes(make)) return setModels([]);
    const res = await fetch(`/api/admin/vpic-models?make=${encodeURIComponent(make)}`);
    if (res.ok) setModels(await res.json());
  }

  const year = new Date().getFullYear() + 1;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div>
        <label className="label" htmlFor="yearStart">
          Year from
        </label>
        <input id="yearStart" name="yearStart" type="number" min={1900} max={year} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="yearEnd">
          Year to
        </label>
        <input id="yearEnd" name="yearEnd" type="number" min={1900} max={year} className="input" placeholder="same" />
      </div>
      <div>
        <label className="label" htmlFor="make">
          Make
        </label>
        <input
          id="make"
          name="make"
          list="vpic-makes"
          className="input"
          required
          onBlur={(e) => loadModels(e.target.value.trim())}
        />
        <datalist id="vpic-makes">
          {makes.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="label" htmlFor="model">
          Model
        </label>
        <input id="model" name="model" list="vpic-models" className="input" required />
        <datalist id="vpic-models">
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="label" htmlFor="submodel">
          Trim / submodel
        </label>
        <input id="submodel" name="submodel" className="input" placeholder="All" />
      </div>
      <div>
        <label className="label" htmlFor="engine">
          Engine
        </label>
        <input id="engine" name="engine" className="input" placeholder="e.g. 2.5L L4" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <input id="notes" name="notes" className="input" placeholder="e.g. Front, with 296mm rotors" />
      </div>
    </div>
  );
}
