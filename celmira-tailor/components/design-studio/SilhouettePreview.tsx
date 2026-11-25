import type { GarmentCategoryId } from "@/lib/types/tailor";

type SilhouettePreviewProps = {
  categoryId: GarmentCategoryId;
  colorHex: string;
  sleeveStyle: string;
  collarStyle: string;
  lengthOption: string;
  laceDetail: string;
  embroideryDetail: string;
  buttonStyle: string;
  zipperStyle: string;
};

const OUTLINE = "#3b2b25";
const MANNEQUIN = "#e7d5c6";

function hasDetail(value: string, disabledPrefix = "Tanpa") {
  return Boolean(value) && !value.startsWith(disabledPrefix);
}

export function SilhouettePreview({
  categoryId,
  colorHex,
  sleeveStyle,
  collarStyle,
  lengthOption,
  laceDetail,
  embroideryDetail,
  buttonStyle,
  zipperStyle,
}: SilhouettePreviewProps) {
  const isShirt = categoryId === "kemeja-pria" || categoryId === "blazer";
  const isBlazer = categoryId === "blazer";
  const isMukena = categoryId === "mukena";
  const isFlowy = categoryId === "gamis" || categoryId === "busana-pernikahan";

  const shortLength =
    lengthOption.includes("Pinggul") ||
    lengthOption.includes("Tunik") ||
    lengthOption.includes("Reguler");
  const midLength = lengthOption.includes("Midi");

  const shoulderY = 70;
  const shoulderHalf = isShirt ? 42 : 38;
  const waistY = 140;
  const waistHalf = isFlowy ? 34 : 27;
  const hipY = 176;
  const hipHalf = isFlowy ? 54 : 43;
  const hemHalf = isMukena ? 68 : isFlowy ? 64 : 50;
  const hemY = isShirt ? 250 : shortLength ? 245 : midLength ? 285 : 312;

  const isShortSleeve = sleeveStyle.includes("Pendek");
  const isPuffSleeve = sleeveStyle.includes("Puff") || sleeveStyle.includes("Balon");
  const isWideSleeve = sleeveStyle.includes("Mukena") || sleeveStyle.includes("Scallop");
  const sleeveEndY = isShortSleeve ? 122 : isWideSleeve ? 214 : 200;

  const sleeveOuter = isPuffSleeve
    ? shoulderHalf + 26
    : isWideSleeve
      ? shoulderHalf + 20
      : shoulderHalf + 14;

  const laceEnabled = hasDetail(laceDetail);
  const embroideryEnabled = hasDetail(embroideryDetail);
  const buttonsEnabled = hasDetail(buttonStyle);
  const zipperEnabled = hasDetail(zipperStyle);

  const dressBody = `M ${110 - shoulderHalf} ${shoulderY}
    C ${110 - shoulderHalf - 2} ${shoulderY + 32} ${110 - waistHalf - 5} ${waistY - 20} ${110 - waistHalf} ${waistY}
    C ${110 - waistHalf - 2} ${waistY + 18} ${110 - hipHalf} ${hipY - 12} ${110 - hipHalf} ${hipY}
    L ${110 - hemHalf} ${hemY}
    Q 110 ${hemY + 9} ${110 + hemHalf} ${hemY}
    L ${110 + hipHalf} ${hipY}
    C ${110 + hipHalf} ${hipY - 12} ${110 + waistHalf + 2} ${waistY + 18} ${110 + waistHalf} ${waistY}
    C ${110 + waistHalf + 5} ${waistY - 20} ${110 + shoulderHalf + 2} ${shoulderY + 32} ${110 + shoulderHalf} ${shoulderY}
    Q 110 ${shoulderY + 14} ${110 - shoulderHalf} ${shoulderY} Z`;

  const shirtBody = `M ${110 - shoulderHalf} ${shoulderY}
    Q 110 ${shoulderY + 12} ${110 + shoulderHalf} ${shoulderY}
    L ${110 + shoulderHalf + 2} ${shoulderY + 34}
    L ${110 + shoulderHalf + 6} ${hemY}
    Q 110 ${hemY + 8} ${110 - shoulderHalf - 6} ${hemY}
    L ${110 - shoulderHalf - 2} ${shoulderY + 34} Z`;

  const mukenaBody = `M ${110 - shoulderHalf - 4} ${shoulderY}
    Q 110 ${shoulderY + 10} ${110 + shoulderHalf + 4} ${shoulderY}
    C ${110 + shoulderHalf + 18} ${shoulderY + 70} ${110 + hemHalf} ${hemY - 40} ${110 + hemHalf} ${hemY}
    Q 110 ${hemY + 9} ${110 - hemHalf} ${hemY}
    C ${110 - hemHalf} ${hemY - 40} ${110 - shoulderHalf - 18} ${shoulderY + 70} ${110 - shoulderHalf - 4} ${shoulderY} Z`;

  const bodyPath = isMukena ? mukenaBody : isShirt ? shirtBody : dressBody;

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 220 340"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="110" cy="330" fill={OUTLINE} fillOpacity="0.08" rx="68" ry="7" />

      {/* Sleeves di belakang badan */}
      <g stroke={OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.28">
        <path
          d={`M ${110 - shoulderHalf} ${shoulderY}
              L ${110 - sleeveOuter} ${shoulderY + (isPuffSleeve ? 2 : 10)}
              Q ${110 - sleeveOuter - 6} ${shoulderY + 50} ${110 - shoulderHalf - 8} ${sleeveEndY}
              L ${110 - shoulderHalf + 3} ${sleeveEndY}
              Q ${110 - shoulderHalf + 2} ${shoulderY + 30} ${110 - shoulderHalf + 4} ${shoulderY + 4} Z`}
          fill={colorHex}
          strokeWidth={1.2}
        />
        <path
          d={`M ${110 + shoulderHalf} ${shoulderY}
              L ${110 + sleeveOuter} ${shoulderY + (isPuffSleeve ? 2 : 10)}
              Q ${110 + sleeveOuter + 6} ${shoulderY + 50} ${110 + shoulderHalf + 8} ${sleeveEndY}
              L ${110 + shoulderHalf - 3} ${sleeveEndY}
              Q ${110 + shoulderHalf - 2} ${shoulderY + 30} ${110 + shoulderHalf - 4} ${shoulderY + 4} Z`}
          fill={colorHex}
          strokeWidth={1.2}
        />
      </g>

      {/* Badan busana */}
      <path d={bodyPath} fill={colorHex} stroke={OUTLINE} strokeOpacity="0.38" strokeWidth={1.4} />

      {/* Lipatan kain halus */}
      <g stroke="#ffffff" strokeOpacity="0.14" strokeWidth={1.1}>
        <path d={`M ${110 - waistHalf + 6} ${waistY + 10} Q ${110 - 16} ${hipY + 20} ${110 - 22} ${hemY - 12}`} />
        <path d={`M ${110 + waistHalf - 6} ${waistY + 10} Q ${110 + 16} ${hipY + 20} ${110 + 22} ${hemY - 12}`} />
      </g>

      {/* Mannequin: leher & kepala */}
      <rect fill={MANNEQUIN} height="12" stroke={OUTLINE} strokeOpacity="0.2" width="12" x="104" y="58" />
      <ellipse cx="110" cy="42" fill={MANNEQUIN} rx="15" ry="18" stroke={OUTLINE} strokeOpacity="0.22" strokeWidth={1.1} />

      {/* Hood mukena */}
      {isMukena ? (
        <path
          d="M 84 66 Q 84 16 110 14 Q 136 16 136 66 L 127 80 Q 110 72 93 80 Z"
          fill={colorHex}
          stroke={OUTLINE}
          strokeOpacity="0.35"
          strokeWidth={1.3}
        />
      ) : null}

      {/* Kerah */}
      <g stroke={OUTLINE} strokeOpacity="0.45" strokeWidth={1.2} strokeLinecap="round">
        {collarStyle.includes("Shanghai") ? (
          <path d="M 98 64 L 98 75 Q 110 80 122 75 L 122 64" />
        ) : collarStyle.includes("Kartini") || collarStyle.includes("V-Neck") ? (
          <path d="M 99 64 L 110 88 L 121 64" />
        ) : collarStyle.includes("Bulat") ? (
          <path d="M 98 64 Q 110 82 122 64" />
        ) : collarStyle.includes("Kemeja") ? (
          <>
            <path d="M 110 64 L 97 64 L 105 82 Z" fill={colorHex} />
            <path d="M 110 64 L 123 64 L 115 82 Z" fill={colorHex} />
          </>
        ) : collarStyle.includes("Lapel") ? (
          <>
            <path d="M 110 64 L 94 64 L 106 104 Z" fill={colorHex} fillOpacity="0.88" />
            <path d="M 110 64 L 126 64 L 114 104 Z" fill={colorHex} fillOpacity="0.88" />
            <path d="M 110 104 L 110 170" strokeDasharray="4 5" />
          </>
        ) : (
          <path d="M 100 64 Q 110 74 120 64" />
        )}
      </g>

      {/* Detail bordir */}
      {embroideryEnabled ? (
        <g fill="#ffffff" fillOpacity="0.4">
          {[92, 102, 118, 128].map((x) =>
            [98, 112, 126].map((y) => <circle cx={x} cy={y} key={`${x}-${y}`} r="1.5" />)
          )}
        </g>
      ) : null}

      {/* Kancing */}
      {buttonsEnabled ? (
        <g fill="#fbf7f2" stroke={OUTLINE} strokeOpacity="0.25" strokeWidth="0.6">
          {[88, 106, 124, 142, 160].map((y) => (
            <circle cx="110" cy={y} key={y} r="1.9" />
          ))}
        </g>
      ) : null}

      {/* Resleting */}
      {zipperEnabled ? (
        <path
          d={`M 110 82 L 110 ${hemY - 14}`}
          stroke="#fbf7f2"
          strokeDasharray="2 4"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
      ) : null}

      {/* Renda di ujung bawah */}
      {laceEnabled ? (
        <g fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2">
          <path d={`M ${110 - hemHalf + 4} ${hemY} Q 110 ${hemY + 12} ${110 + hemHalf - 4} ${hemY}`} />
          {Array.from({ length: 8 }).map((_, index) => {
            const x = 110 - hemHalf + 8 + ((hemHalf * 2 - 16) / 7) * index;
            return <circle cx={x} cy={hemY + 4} key={index} r="2.4" />;
          })}
        </g>
      ) : null}

      {/* Aksen blazer */}
      {isBlazer ? (
        <path
          d={`M 110 104 L 110 ${hemY - 6}`}
          stroke={OUTLINE}
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
      ) : null}

      {/* Aksen pinggang kebaya */}
      {categoryId === "kebaya" ? (
        <path
          d={`M ${110 - waistHalf - 2} ${waistY + 4} Q 110 ${waistY + 12} ${110 + waistHalf + 2} ${waistY + 4}`}
          stroke={OUTLINE}
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
      ) : null}
    </svg>
  );
}
