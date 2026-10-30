import { useState } from "react";
import { RotateCcw, Heart, SlidersHorizontal } from "lucide-react";
import { stageForCare, type Care, type Category, type PetKind } from "./model";
import type { Equipped } from "./Outfits";
import { Pet } from "./Pets";
import {
  careConditions,
  careLabels,
  careNames,
  careTier,
  careValues,
  excellentCare,
  previewCare,
} from "./careVisuals";

const keys: Category[] = ["food", "water", "clean", "happy"];
export function CareGuide({
  kind,
  realCare,
  equipped,
}: {
  kind: PetKind;
  realCare: Care;
  equipped: Equipped;
}) {
  const [category, setCategory] = useState<Category>("happy");
  const [selected, setSelected] = useState(0);
  const [sim, setSim] = useState<Care>(() => ({ ...excellentCare }));
  const [simSpecies, setSimSpecies] = useState<PetKind>(kind);
  const [showLifecycle, setShowLifecycle] = useState(true);
  const [source, setSource] = useState("Excellent care");
  const simStage = showLifecycle ? stageForCare(sim) : 0;
  return (
    <section className="care-guide" aria-label="Care condition previews">
      <div className="care-guide-heading">
        <span className="eyebrow">THE LITTLE DETAILS SAY A LOT</span>
        <h2>Care Conditions</h2>
        <p>
          Four needs, five conditions each. These layers combine on your pal,
          alongside its overall life stage.
        </p>
      </div>
      <div
        className="care-tabs"
        role="tablist"
        aria-label="Care condition category"
      >
        {keys.map((key) => (
          <button
            key={key}
            id={`care-tab-${key}`}
            role="tab"
            aria-selected={category === key}
            aria-controls="care-condition-panel"
            onClick={() => {
              setCategory(key);
              setSelected(0);
            }}
          >
            {careLabels[key]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="care-condition-panel"
        aria-labelledby={`care-tab-${category}`}
      >
        <div className="care-focus-preview">
          <Pet
            kind={kind}
            level={0}
            care={previewCare(category, careValues[selected])}
            equipped={equipped}
            preview
          />
          <div>
            <span className="eyebrow">
              {careLabels[category]} · {careValues[selected]}/100
            </span>
            <h3>{careConditions[category][selected].name}</h3>
            <p>{careConditions[category][selected].description}</p>
            <span className="preview-badge">
              Preview only · other needs at 100
            </span>
          </div>
        </div>
        <div
          className="care-condition-gallery"
          aria-label={`${careLabels[category]} appearance gallery`}
        >
          {careValues.map((value, i) => (
            <button
              key={value}
              className={selected === i ? "selected" : ""}
              aria-pressed={selected === i}
              aria-label={`Preview ${careLabels[category]} ${value}: ${careConditions[category][i].name}`}
              onClick={() => setSelected(i)}
            >
              <div className="care-card-art" aria-hidden="true">
                <Pet
                  kind={kind}
                  level={0}
                  care={previewCare(category, value)}
                  equipped={equipped}
                  preview
                />
              </div>
              <strong>
                {value}
                <small>/100</small>
              </strong>
              <h4>{careConditions[category][i].name}</h4>
              <span>{careNames[i]}</span>
              <p>{careConditions[category][i].description}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="care-simulator" aria-label="Preview-only care simulator">
        <div className="simulator-heading">
          <SlidersHorizontal size={18} />
          <h3>Mix a little mood</h3>
          <span className="preview-badge">Preview only · never saved</span>
        </div>
        <p>
          Combine needs to see how they look together. Your real pet, coins, and
          inventory stay untouched.
        </p>
        <label className="sim-species">
          Preview pet
          <select
            value={simSpecies}
            onChange={(e) => setSimSpecies(e.target.value as PetKind)}
          >
            <option value="mochi">Mochi</option>
            <option value="pippin">Pippin</option>
            <option value="crumb">Crumb</option>
          </select>
        </label>
        <div className="simulator-content">
          <div className="simulator-pet">
            <Pet
              kind={simSpecies}
              level={simStage}
              care={sim}
              equipped={equipped}
              preview
            />
            <small>
              {source} ·{" "}
              {showLifecycle ? "Life stage + care layers" : "Care layers only"}
            </small>
          </div>
          <div className="simulator-controls">
            {keys.map((key) => (
              <label className={`care-slider ${key}`} key={key}>
                <span>
                  {careLabels[key]}
                  <output htmlFor={`preview-${key}`}>
                    {sim[key]}
                    <small>/100</small>
                  </output>
                </span>
                <input
                  id={`preview-${key}`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={sim[key]}
                  aria-label={`Preview ${careLabels[key]}`}
                  onChange={(e) => {
                    setSim((v) => ({ ...v, [key]: Number(e.target.value) }));
                    setSource("Your preview mix");
                  }}
                />
                <small>{careConditions[key][careTier(sim[key])].name}</small>
              </label>
            ))}
          </div>
        </div>
        <label className="sim-stage-toggle">
          <input
            type="checkbox"
            checked={showLifecycle}
            onChange={(e) => setShowLifecycle(e.target.checked)}
          />
          Include overall lifecycle appearance
        </label>
        <div className="simulator-actions">
          <button
            className="secondary"
            onClick={() => {
              setSim({ ...excellentCare });
              setSource("Excellent care");
            }}
          >
            <RotateCcw size={14} />
            Reset Preview
          </button>
          <button
            className="secondary"
            onClick={() => {
              setSim({ ...realCare });
              setSimSpecies(kind);
              setSource("Snapshot of real stats");
            }}
          >
            <Heart size={14} />
            Current Real Stats
          </button>
        </div>
      </div>
    </section>
  );
}
