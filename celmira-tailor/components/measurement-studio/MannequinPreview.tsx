"use client";

import {
  computeMannequinProportions,
  getTemplateFieldValue,
} from "@/lib/measurement-studio";
import type {
  MeasurementExtraValues,
  MeasurementTemplateConfig,
  MeasurementTemplateField,
  MeasurementValues,
} from "@/lib/types/tailor";

type MannequinPreviewProps = {
  template: MeasurementTemplateConfig;
  values: MeasurementValues;
  extraValues: MeasurementExtraValues;
  activeFieldKey: string | null;
  onSelectField?: (fieldKey: string) => void;
};

const CX = 150;
const ESPRESSO = "#3b2b25";
const COCOA = "#704f46";
const ROSE = "#c19a90";
const BLUSH = "#d9bdb2";
const SAND = "#eaded3";
const CREAM = "#f5ece3";
const IVORY = "#fbf7f2";
const MANNEQUIN_SKIN = "#ebd9ca";

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function PillTag({
  x,
  y,
  text,
  active,
}: {
  x: number;
  y: number;
  text: string;
  active: boolean;
}) {
  const width = Math.max(46, text.length * 6.2 + 12);
  const height = 18;
  return (
    <g transform={`translate(${round(x - width / 2)}, ${round(y - height / 2)})`}>
      <rect
        fill={active ? ESPRESSO : IVORY}
        height={height}
        rx={9}
        stroke={active ? ESPRESSO : COCOA}
        strokeOpacity={active ? 1 : 0.45}
        strokeWidth={1}
        width={width}
      />
      <text
        dominantBaseline="central"
        fill={active ? IVORY : ESPRESSO}
        fontFamily="var(--font-sans)"
        fontSize="9.5"
        fontWeight={active ? 600 : 500}
        textAnchor="middle"
        x={width / 2}
        y={height / 2}
      >
        {text}
      </text>
    </g>
  );
}

export function MannequinPreview({
  template,
  values,
  extraValues,
  activeFieldKey,
  onSelectField,
}: MannequinPreviewProps) {
  const p = computeMannequinProportions(template.id, values, extraValues, [template]);
  const type = template.mannequinType;

  // Koordinat dasar tubuh yang responsif terhadap proporsi ukuran
  const neckHalf = round(11 * p.neckScale);
  const shoulderY = type === "bawahan" ? 84 : 88;
  const shoulderHalf = round((type === "busana-formal" ? 46 : 41) * p.shoulderScale);
  const bustY = 128;
  const bustHalf = round((type === "busana-formal" ? 43 : 40) * p.bustScale);
  const waistY = type === "bawahan" ? 132 : 168;
  const waistHalf = round(31 * p.waistScale);
  const hipY = type === "bawahan" ? 186 : 210;
  const hipHalf = round(46 * p.hipScale);
  const thighY = type === "bawahan" ? 236 : 244;
  const thighHalf = round(20 * p.thighScale);

  const sleeveEndY = round(shoulderY + 24 + p.sleeveRatio * 108);
  const sleeveOuterX = round(shoulderHalf + (type === "busana-formal" ? 17 : 15));

  // Tinggi ujung bawah busana menyesuaikan kategori & panjang (cm)
  const hemY =
    type === "hijab"
      ? round(160 + p.lengthRatio * 136)
      : type === "atasan"
        ? round(192 + p.lengthRatio * 74)
        : type === "busana-formal"
          ? round(205 + p.lengthRatio * 84)
          : type === "bawahan"
            ? round(234 + p.lengthRatio * 124)
            : round(256 + p.lengthRatio * 108);

  const backHemY = round(182 + p.backDropRatio * 145);

  const hemHalf =
    type === "hijab"
      ? round(52 + p.shoulderScale * 18)
      : type === "gamis"
        ? round(Math.max(hipHalf + 12, 54 * p.hipScale + 14))
        : type === "bawahan"
          ? round(Math.max(30, 56 * p.hemScale))
          : type === "busana-formal"
            ? round(Math.max(waistHalf + 8, hipHalf * 0.94))
            : round(Math.max(waistHalf + 8, hipHalf * 0.96));

  const fieldValueLabel = (field: MeasurementTemplateField) => {
    const raw = getTemplateFieldValue({ values, extraValues }, field).trim();
    return raw ? `${raw} cm` : "— cm";
  };

  function renderMeasurementIndicator(field: MeasurementTemplateField) {
    const active = activeFieldKey === field.key;
    const strokeColor = active ? ESPRESSO : COCOA;
    const strokeOpacity = active ? 0.95 : 0.45;
    const strokeWidth = active ? 2 : 1.15;
    const dash = active ? undefined : "3 3";
    const valueText = fieldValueLabel(field);

    const handleClick = onSelectField ? () => onSelectField(field.key) : undefined;
    const interactiveProps = onSelectField
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-label": `Pilih panduan ${field.label}: ${valueText}`,
          onClick: handleClick,
          onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleClick?.();
            }
          },
          className: "cursor-pointer focus:outline-none",
        }
      : {};

    switch (field.mannequinAnchor) {
      case "face": {
        const rx = round(16 * p.neckScale);
        const ry = round(20 * p.neckScale);
        return (
          <g key={field.key} {...interactiveProps}>
            <ellipse
              cx={CX}
              cy={56}
              fill={active ? ROSE : "none"}
              fillOpacity={active ? 0.14 : 0}
              rx={rx}
              ry={ry}
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
            />
            <line
              stroke={strokeColor}
              strokeOpacity={strokeOpacity}
              strokeWidth={1}
              x1={CX + rx}
              x2={CX + 56}
              y1={56}
              y2={56}
            />
            <PillTag active={active} text={valueText} x={CX + 80} y={56} />
          </g>
        );
      }

      case "neck": {
        const y = 76;
        return (
          <g key={field.key} {...interactiveProps}>
            <path
              d={`M ${CX - neckHalf - 3} ${y} Q ${CX} ${y + 9} ${CX + neckHalf + 3} ${y}`}
              fill="none"
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
            />
            <line
              stroke={strokeColor}
              strokeOpacity={strokeOpacity}
              strokeWidth={1}
              x1={CX + neckHalf + 3}
              x2={CX + 58}
              y1={y}
              y2={y - 6}
            />
            <PillTag active={active} text={valueText} x={CX + 82} y={y - 6} />
          </g>
        );
      }

      case "shoulder": {
        const y = shoulderY - 6;
        return (
          <g key={field.key} {...interactiveProps}>
            <line
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              x1={CX - shoulderHalf}
              x2={CX + shoulderHalf}
              y1={y}
              y2={y}
            />
            <circle cx={CX - shoulderHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <circle cx={CX + shoulderHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <PillTag active={active} text={valueText} x={CX} y={y - 14} />
          </g>
        );
      }

      case "bust": {
        const y = bustY;
        return (
          <g key={field.key} {...interactiveProps}>
            <path
              d={`M ${CX - bustHalf} ${y} Q ${CX} ${y + 8} ${CX + bustHalf} ${y}`}
              fill="none"
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
            />
            <circle cx={CX - bustHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <circle cx={CX + bustHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <PillTag active={active} text={valueText} x={CX} y={y - 10} />
          </g>
        );
      }

      case "waist": {
        const y = waistY;
        return (
          <g key={field.key} {...interactiveProps}>
            <path
              d={`M ${CX - waistHalf} ${y} Q ${CX} ${y + 7} ${CX + waistHalf} ${y}`}
              fill="none"
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
            />
            <circle cx={CX - waistHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <circle cx={CX + waistHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <PillTag active={active} text={valueText} x={CX} y={y - 10} />
          </g>
        );
      }

      case "hip": {
        const y = hipY;
        return (
          <g key={field.key} {...interactiveProps}>
            <path
              d={`M ${CX - hipHalf} ${y} Q ${CX} ${y + 9} ${CX + hipHalf} ${y}`}
              fill="none"
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
            />
            <circle cx={CX - hipHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <circle cx={CX + hipHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <PillTag active={active} text={valueText} x={CX} y={y + 15} />
          </g>
        );
      }

      case "sleeve": {
        const startX = CX - shoulderHalf - 8;
        const startY = shoulderY + 6;
        const endX = CX - sleeveOuterX - 7;
        const endY = sleeveEndY;
        return (
          <g key={field.key} {...interactiveProps}>
            <line
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              x1={startX}
              x2={endX}
              y1={startY}
              y2={endY}
            />
            <circle cx={startX} cy={startY} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <circle cx={endX} cy={endY} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <PillTag
              active={active}
              text={valueText}
              x={Math.max(40, endX - 24)}
              y={round((startY + endY) / 2)}
            />
          </g>
        );
      }

      case "thigh": {
        const y = thighY;
        const leftX = CX - thighHalf - 10;
        const rightX = CX - 6;
        return (
          <g key={field.key} {...interactiveProps}>
            <path
              d={`M ${leftX} ${y} Q ${(leftX + rightX) / 2} ${y + 6} ${rightX} ${y}`}
              fill="none"
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
            />
            <line
              stroke={strokeColor}
              strokeOpacity={strokeOpacity}
              strokeWidth={1}
              x1={leftX}
              x2={56}
              y1={y}
              y2={y}
            />
            <PillTag active={active} text={valueText} x={42} y={y} />
          </g>
        );
      }

      case "hem": {
        const y = hemY + 12;
        return (
          <g key={field.key} {...interactiveProps}>
            <line
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              x1={CX - hemHalf}
              x2={CX + hemHalf}
              y1={y}
              y2={y}
            />
            <circle cx={CX - hemHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <circle cx={CX + hemHalf} cy={y} fill={strokeColor} fillOpacity={strokeOpacity} r={active ? 3 : 2} />
            <PillTag active={active} text={valueText} x={CX} y={Math.min(386, y + 14)} />
          </g>
        );
      }

      case "back-length": {
        const x = 44;
        const topY = 34;
        return (
          <g key={field.key} {...interactiveProps}>
            <line
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              x1={x}
              x2={x}
              y1={topY}
              y2={backHemY}
            />
            <line stroke={strokeColor} strokeOpacity={strokeOpacity} strokeWidth={1.2} x1={x - 5} x2={x + 5} y1={topY} y2={topY} />
            <line stroke={strokeColor} strokeOpacity={strokeOpacity} strokeWidth={1.2} x1={x - 5} x2={x + 5} y1={backHemY} y2={backHemY} />
            <PillTag active={active} text={valueText} x={x} y={round((topY + backHemY) / 2)} />
          </g>
        );
      }

      case "length":
      default: {
        const x = 256;
        const topY = type === "bawahan" ? waistY : type === "hijab" ? 76 : shoulderY;
        return (
          <g key={field.key} {...interactiveProps}>
            <line
              stroke={strokeColor}
              strokeDasharray={dash}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              x1={x}
              x2={x}
              y1={topY}
              y2={hemY}
            />
            <line stroke={strokeColor} strokeOpacity={strokeOpacity} strokeWidth={1.2} x1={x - 5} x2={x + 5} y1={topY} y2={topY} />
            <line stroke={strokeColor} strokeOpacity={strokeOpacity} strokeWidth={1.2} x1={x - 5} x2={x + 5} y1={hemY} y2={hemY} />
            <PillTag active={active} text={valueText} x={x} y={round((topY + hemY) / 2)} />
          </g>
        );
      }
    }
  }

  return (
    <svg
      aria-label={`Ilustrasi mannequin 2D untuk template ${template.name}`}
      className="h-full w-full select-none"
      fill="none"
      role="img"
      viewBox="0 0 300 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Garis bantu vertikal halus & alas bayangan */}
      <line
        stroke={COCOA}
        strokeDasharray="2 6"
        strokeOpacity="0.16"
        strokeWidth="1"
        x1={CX}
        x2={CX}
        y1="16"
        y2="384"
      />
      <ellipse cx={CX} cy="382" fill={ESPRESSO} fillOpacity="0.07" rx="74" ry="8" />

      {/* ================================================================
          SILUET MANNEQUIN PER KATEGORI
         ================================================================ */}

      {type === "hijab" ? (
        <g>
          {/* Lapisan belakang hijab/mukena */}
          <path
            d={`M ${CX - 34} 66
                Q ${CX - 38} 20 ${CX} 18
                Q ${CX + 38} 20 ${CX + 34} 66
                C ${CX + shoulderHalf + 24} 118 ${CX + hemHalf + 14} ${backHemY - 40} ${CX + hemHalf + 8} ${backHemY}
                Q ${CX} ${backHemY + 14} ${CX - hemHalf - 8} ${backHemY}
                C ${CX - hemHalf - 14} ${backHemY - 40} ${CX - shoulderHalf - 24} 118 ${CX - 34} 66 Z`}
            fill={SAND}
            stroke={COCOA}
            strokeOpacity="0.34"
            strokeWidth="1.2"
          />

          {/* Lapisan depan hijab/mukena */}
          <path
            d={`M ${CX - 28} 68
                Q ${CX - 30} 26 ${CX} 24
                Q ${CX + 30} 26 ${CX + 28} 68
                C ${CX + shoulderHalf + 12} 102 ${CX + hemHalf} ${hemY - 30} ${CX + hemHalf - 4} ${hemY}
                Q ${CX} ${hemY + 14} ${CX - hemHalf + 4} ${hemY}
                C ${CX - hemHalf} ${hemY - 30} ${CX - shoulderHalf - 12} 102 ${CX - 28} 68 Z`}
            fill={BLUSH}
            fillOpacity="0.65"
            stroke={ESPRESSO}
            strokeOpacity="0.42"
            strokeWidth="1.4"
          />

          {/* Lipatan kain lembut */}
          <path
            d={`M ${CX - 20} 104 Q ${CX - 28} ${(104 + hemY) / 2} ${CX - 32} ${hemY - 12}`}
            stroke={IVORY}
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
          <path
            d={`M ${CX + 20} 104 Q ${CX + 28} ${(104 + hemY) / 2} ${CX + 32} ${hemY - 12}`}
            stroke={IVORY}
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />

          {/* Bukaan wajah */}
          <ellipse
            cx={CX}
            cy={56}
            fill={MANNEQUIN_SKIN}
            rx={round(16 * p.neckScale)}
            ry={round(20 * p.neckScale)}
            stroke={ESPRESSO}
            strokeOpacity="0.32"
            strokeWidth="1.2"
          />
        </g>
      ) : null}

      {type === "bawahan" ? (
        <g>
          {/* Referensi torso atas redup agar posisi pinggang jelas */}
          <path
            d={`M ${CX - 32} 70
                L ${CX + 32} 70
                C ${CX + 34} 96 ${CX + waistHalf + 2} 116 ${CX + waistHalf} ${waistY}
                L ${CX - waistHalf} ${waistY}
                C ${CX - waistHalf - 2} 116 ${CX - 34} 96 ${CX - 32} 70 Z`}
            fill={CREAM}
            stroke={COCOA}
            strokeDasharray="3 4"
            strokeOpacity="0.3"
            strokeWidth="1.1"
          />
          <rect
            fill={MANNEQUIN_SKIN}
            fillOpacity="0.65"
            height="14"
            rx="5"
            width="16"
            x={CX - 8}
            y="56"
          />
          <ellipse
            cx={CX}
            cy="42"
            fill={MANNEQUIN_SKIN}
            fillOpacity="0.65"
            rx="14"
            ry="17"
            stroke={COCOA}
            strokeOpacity="0.2"
            strokeWidth="1"
          />

          {/* Siluet bawahan (rok / celana) */}
          <path
            d={`M ${CX - waistHalf} ${waistY}
                L ${CX + waistHalf} ${waistY}
                C ${CX + waistHalf + 4} ${waistY + 22} ${CX + hipHalf} ${hipY - 16} ${CX + hipHalf} ${hipY}
                L ${CX + hemHalf} ${hemY}
                Q ${CX} ${hemY + 10} ${CX - hemHalf} ${hemY}
                L ${CX - hipHalf} ${hipY}
                C ${CX - hipHalf} ${hipY - 16} ${CX - waistHalf - 4} ${waistY + 22} ${CX - waistHalf} ${waistY} Z`}
            fill={BLUSH}
            fillOpacity="0.62"
            stroke={ESPRESSO}
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />

          {/* Ban pinggang */}
          <rect
            fill={ROSE}
            fillOpacity="0.55"
            height="10"
            rx="3"
            stroke={ESPRESSO}
            strokeOpacity="0.38"
            strokeWidth="1.1"
            width={round(waistHalf * 2)}
            x={round(CX - waistHalf)}
            y={waistY - 5}
          />

          {/* Garis lipit / acuan kaki tengah halus */}
          <path
            d={`M ${CX} ${hipY + 14} L ${CX} ${hemY - 8}`}
            stroke={ESPRESSO}
            strokeDasharray="4 4"
            strokeOpacity="0.2"
            strokeWidth="1.1"
          />
          <path
            d={`M ${CX - waistHalf * 0.45} ${waistY + 10} Q ${CX - hipHalf * 0.45} ${hipY + 24} ${CX - hemHalf * 0.45} ${hemY - 10}`}
            stroke={IVORY}
            strokeOpacity="0.4"
            strokeWidth="1.1"
          />
          <path
            d={`M ${CX + waistHalf * 0.45} ${waistY + 10} Q ${CX + hipHalf * 0.45} ${hipY + 24} ${CX + hemHalf * 0.45} ${hemY - 10}`}
            stroke={IVORY}
            strokeOpacity="0.4"
            strokeWidth="1.1"
          />
        </g>
      ) : null}

      {type === "atasan" || type === "gamis" || type === "busana-formal" ? (
        <g>
          {/* Kepala & leher mannequin */}
          <rect
            fill={MANNEQUIN_SKIN}
            height="18"
            rx="4"
            stroke={ESPRESSO}
            strokeOpacity="0.24"
            strokeWidth="1.1"
            width={round(neckHalf * 2)}
            x={round(CX - neckHalf)}
            y="67"
          />
          <ellipse
            cx={CX}
            cy="48"
            fill={MANNEQUIN_SKIN}
            rx="16"
            ry="20"
            stroke={ESPRESSO}
            strokeOpacity="0.25"
            strokeWidth="1.1"
          />

          {/* Panduan tubuh bawah redup untuk template atasan & formal */}
          {type === "atasan" || type === "busana-formal" ? (
            <path
              d={`M ${CX - hipHalf + 4} ${hipY}
                  L ${CX - hipHalf + 12} 352
                  L ${CX - 6} 352
                  L ${CX} ${hipY + 34}
                  L ${CX + 6} 352
                  L ${CX + hipHalf - 12} 352
                  L ${CX + hipHalf - 4} ${hipY} Z`}
              fill={CREAM}
              stroke={COCOA}
              strokeDasharray="3 4"
              strokeOpacity="0.22"
              strokeWidth="1"
            />
          ) : null}

          {/* Lengan kiri & kanan */}
          <g fill={SAND} stroke={ESPRESSO} strokeOpacity="0.34" strokeWidth="1.2">
            <path
              d={`M ${CX - shoulderHalf} ${shoulderY}
                  L ${CX - sleeveOuterX} ${shoulderY + 12}
                  Q ${CX - sleeveOuterX - 4} ${(shoulderY + sleeveEndY) / 2} ${CX - sleeveOuterX + 2} ${sleeveEndY}
                  L ${CX - shoulderHalf + 1} ${sleeveEndY}
                  Q ${CX - shoulderHalf - 2} ${shoulderY + 40} ${CX - shoulderHalf + 5} ${shoulderY + 18} Z`}
            />
            <path
              d={`M ${CX + shoulderHalf} ${shoulderY}
                  L ${CX + sleeveOuterX} ${shoulderY + 12}
                  Q ${CX + sleeveOuterX + 4} ${(shoulderY + sleeveEndY) / 2} ${CX + sleeveOuterX - 2} ${sleeveEndY}
                  L ${CX + shoulderHalf - 1} ${sleeveEndY}
                  Q ${CX + shoulderHalf + 2} ${shoulderY + 40} ${CX + shoulderHalf - 5} ${shoulderY + 18} Z`}
            />
          </g>

          {/* Badan busana utama */}
          <path
            d={`M ${CX - neckHalf - 2} ${shoulderY - 6}
                L ${CX - shoulderHalf} ${shoulderY}
                C ${CX - shoulderHalf - 1} ${shoulderY + 20} ${CX - bustHalf - 2} ${bustY - 12} ${CX - bustHalf} ${bustY}
                C ${CX - bustHalf + 2} ${bustY + 16} ${CX - waistHalf - 3} ${waistY - 14} ${CX - waistHalf} ${waistY}
                C ${CX - waistHalf - 2} ${waistY + 18} ${CX - hipHalf} ${hipY - 14} ${CX - hipHalf} ${hipY}
                L ${CX - hemHalf} ${hemY}
                Q ${CX} ${hemY + (type === "gamis" ? 12 : 8)} ${CX + hemHalf} ${hemY}
                L ${CX + hipHalf} ${hipY}
                C ${CX + hipHalf} ${hipY - 14} ${CX + waistHalf + 2} ${waistY + 18} ${CX + waistHalf} ${waistY}
                C ${CX + waistHalf + 3} ${waistY - 14} ${CX + bustHalf - 2} ${bustY + 16} ${CX + bustHalf} ${bustY}
                C ${CX + bustHalf + 2} ${bustY - 12} ${CX + shoulderHalf + 1} ${shoulderY + 20} ${CX + shoulderHalf} ${shoulderY}
                L ${CX + neckHalf + 2} ${shoulderY - 6}
                Q ${CX} ${shoulderY + 7} ${CX - neckHalf - 2} ${shoulderY - 6} Z`}
            fill={type === "busana-formal" ? ROSE : BLUSH}
            fillOpacity={type === "busana-formal" ? 0.45 : 0.62}
            stroke={ESPRESSO}
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />

          {/* Aksen khusus per kategori */}
          {type === "busana-formal" ? (
            <g stroke={ESPRESSO} strokeOpacity="0.42" strokeWidth="1.2">
              <path d={`M ${CX - neckHalf - 2} ${shoulderY - 5} L ${CX} ${bustY + 10} L ${CX + neckHalf + 2} ${shoulderY - 5}`} />
              <path d={`M ${CX} ${bustY + 10} L ${CX} ${hemY - 4}`} />
              <circle cx={CX} cy={waistY - 6} fill={IVORY} r="2.2" />
              <circle cx={CX} cy={waistY + 14} fill={IVORY} r="2.2" />
            </g>
          ) : null}

          {type === "atasan" ? (
            <path
              d={`M ${CX - neckHalf} ${shoulderY - 5} L ${CX} ${bustY - 10} L ${CX + neckHalf} ${shoulderY - 5}`}
              stroke={ESPRESSO}
              strokeOpacity="0.38"
              strokeWidth="1.2"
            />
          ) : null}

          {type === "gamis" ? (
            <g stroke={IVORY} strokeOpacity="0.42" strokeWidth="1.2">
              <path d={`M ${CX - waistHalf + 8} ${waistY + 14} Q ${CX - hipHalf * 0.6} ${hipY + 34} ${CX - hemHalf * 0.58} ${hemY - 14}`} />
              <path d={`M ${CX + waistHalf - 8} ${waistY + 14} Q ${CX + hipHalf * 0.6} ${hipY + 34} ${CX + hemHalf * 0.58} ${hemY - 14}`} />
            </g>
          ) : null}
        </g>
      ) : null}

      {/* ================================================================
          GARIS INDIKATOR UKURAN INTERAKTIF
         ================================================================ */}
      <g>{template.fields.map((field) => renderMeasurementIndicator(field))}</g>
    </svg>
  );
}
