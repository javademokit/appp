import { useCallback, useEffect, useState } from "react";
import { api } from "./payrollApi";
import { DED_TYPES, EARN_TYPES, inr } from "./utils";

const clone = (x) => JSON.parse(JSON.stringify(x));
const NEW_STRUCTURE = {
  id: null, name: "", basicPct: "",
  components: [],
};

function Editor({ draft, setDraft, onSave, onDelete, onDuplicate, assigned, notify }) {
  const [gross, setGross] = useState("");
  const [pv, setPv] = useState(null);
  const validComponents = draft.components.every((component) =>
    String(component.name || "").trim()
      && (component.calcType === "BALANCE" || (component.value !== "" && Number.isFinite(Number(component.value)))));
  const canSave = Boolean(draft.name.trim())
    && Number(draft.basicPct) >= 1
    && Number(draft.basicPct) <= 100
    && validComponents;

  useEffect(() => {
    if (!draft.name.trim() || !Number(draft.basicPct) || !validComponents
      || gross === "" || !Number.isFinite(Number(gross)) || Number(gross) < 0) {
      setPv(null);
      return undefined;
    }
    const t = setTimeout(() => {
      api.previewStructure(draft, Number(gross)).then(setPv).catch((e) => {
        setPv(null);
        notify(e.message);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [draft, gross, notify, validComponents]);

  const setC = (i, p) => setDraft((d) => ({ ...d, components: d.components.map((c, j) => (j === i ? { ...c, ...p } : c)) }));
  const addC = (kind, types) => setDraft((d) => ({
    ...d,
    components: [...d.components, { name: "", kind, calcType: Object.keys(types)[0], value: "", cap: null }],
  }));
  const rmC = (i) => setDraft((d) => ({ ...d, components: d.components.filter((_, j) => j !== i) }));

  const rows = (kind, types) =>
    draft.components.map((c, i) => c.kind !== kind ? null : (
      <div className="er" key={i}>
        <input className="nm" value={c.name} aria-label="Component name" onChange={(e) => setC(i, { name: e.target.value })} />
        <select className="ty" value={c.calcType} aria-label="Calculation" onChange={(e) => setC(i, { calcType: e.target.value })}>
          {Object.entries(types).map(([a, b]) => <option key={a} value={a}>{b}</option>)}
        </select>
        <input className="vl" type="number" min="0" aria-label="Value" disabled={c.calcType === "BALANCE"}
          placeholder={c.calcType === "BALANCE" ? "auto" : ""} value={c.calcType === "BALANCE" ? "" : c.value ?? ""}
          onChange={(e) => setC(i, { value: e.target.value === "" ? "" : Number(e.target.value) })} />
        {kind === "DEDUCTION" && c.calcType === "PCT_BASIC" && (
          <input className="vl" type="number" min="0" placeholder="Cap ₹" aria-label="Basic cap" value={c.cap ?? ""}
            onChange={(e) => setC(i, { cap: e.target.value === "" ? null : Number(e.target.value) })} />
        )}
        <button type="button" className="btn ghost sm" aria-label="Remove" onClick={() => rmC(i)}>✕</button>
      </div>
    ));

  return (
    <div className="card">
      <div className="row">
        <input style={{ flex: 1, fontWeight: 600 }} value={draft.name} placeholder="Template name" aria-label="Template name" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <button type="button" className="btn sm" disabled={!canSave} onClick={onSave}>Save</button>
        <button type="button" className="btn ghost sm" onClick={onDuplicate}>Duplicate</button>
        <button type="button" className="btn ghost sm" disabled={assigned > 0} title={assigned > 0 ? "Reassign employees first" : ""} onClick={onDelete}>Delete</button>
      </div>
      <div className="sub" style={{ marginBottom: 8 }}>{draft.id ? `${assigned} employee${assigned === 1 ? "" : "s"} assigned` : "Not saved yet"}</div>
      <div className="row">
        <label>Basic is <input type="number" min="1" max="100" style={{ width: 70 }} value={draft.basicPct}
          onChange={(e) => setDraft({ ...draft, basicPct: e.target.value === "" ? "" : Number(e.target.value) })} /> % of monthly gross</label>
      </div>
      <div className="hd">Earnings (after basic)</div>
      {rows("EARNING", EARN_TYPES)}
      <button type="button" className="btn ghost sm" onClick={() => addC("EARNING", EARN_TYPES)}>+ Add earning</button>
      <div className="hd" style={{ marginTop: 14 }}>Deductions</div>
      {rows("DEDUCTION", DED_TYPES)}
      <button type="button" className="btn ghost sm" onClick={() => addC("DEDUCTION", DED_TYPES)}>+ Add deduction</button>

      <div className="prev">
        <div className="row" style={{ marginBottom: 6 }}>
          <b>Preview, full month</b>
          <label className="sub">Gross ₹ <input type="number" min="0" style={{ width: 110 }} value={gross} onChange={(e) => setGross(e.target.value)} /></label>
        </div>
        {pv?.overAllocated && <div className="warn">Fixed earnings exceed this gross. Lower a component or raise the gross.</div>}
        {pv && pv.earnings.map((x, i) => <div className="ps" key={i}><span>{x.name}</span><span>{inr(x.amount)}</span></div>)}
        {pv && pv.deductions.map((x, i) => <div className="ps" key={"d" + i}><span>− {x.name}</span><span>{inr(x.amount)}</span></div>)}
        {pv && <div className="ps t"><span>Net pay</span><span>{inr(pv.net)}</span></div>}
      </div>
    </div>
  );
}

export default function Structures({ notify }) {
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [draft, setDraft] = useState(null);

  const reload = useCallback(async (selectId) => {
    const [s, e] = await Promise.all([api.structures(), api.employees()]);
    const c = {};
    e.forEach((x) => { c[x.structureId] = (c[x.structureId] || 0) + 1; });
    setList(s);
    setCounts(c);
    const pick = s.find((x) => x.id === selectId) || s[0];
    setDraft(pick ? clone(pick) : clone(NEW_STRUCTURE));
  }, []);
  useEffect(() => { reload().catch((e) => notify(e.message)); }, [reload, notify]);

  const save = async () => {
    try { const s = await api.saveStructure(draft); notify("Structure saved"); await reload(s.id); }
    catch (e) { notify(e.message); }
  };
  const remove = async () => {
    try { if (draft.id) await api.deleteStructure(draft.id); notify("Structure deleted"); await reload(); }
    catch (e) { notify(e.message); }
  };
  const duplicate = () => setDraft({ ...clone(draft), id: null, name: draft.name + " (copy)" });

  if (!draft) return <div className="sub">Loading…</div>;
  return (
    <div className="two">
      <div>
        <div className="tl">
          {list.map((x) => (
            <button type="button" key={x.id} className={x.id === draft.id ? "on" : ""} onClick={() => setDraft(clone(x))}>
              {x.name}<small>Basic {x.basicPct}% · {counts[x.id] || 0} assigned</small>
            </button>
          ))}
        </div>
        <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => setDraft(clone(NEW_STRUCTURE))}>+ New structure</button>
      </div>
      <Editor draft={draft} setDraft={setDraft} onSave={save} onDelete={remove} onDuplicate={duplicate} assigned={counts[draft.id] || 0} notify={notify} />
    </div>
  );
}
