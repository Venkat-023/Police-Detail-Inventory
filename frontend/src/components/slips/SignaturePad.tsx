import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface Props {
  initialUrl?: string;
  onChange: (dataUrl: string | undefined) => void;
  required?: boolean;
  invalid?: boolean;
}

export function SignaturePad({ initialUrl, onChange, required, invalid }: Props) {
  const ref = useRef<SignatureCanvas>(null);
  const [savedUrl, setSavedUrl] = useState<string | undefined>(initialUrl);
  const [hasInk, setHasInk] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 600, h: 200 });

  useEffect(() => {
    const update = () => {
      const w = wrapRef.current?.clientWidth ?? 600;
      setSize({ w, h: 200 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const clear = () => {
    ref.current?.clear();
    setHasInk(false);
    setSavedUrl(undefined);
    onChange(undefined);
  };

  const save = () => {
    if (!ref.current || ref.current.isEmpty()) return;
    const url = ref.current.toDataURL("image/png");
    setSavedUrl(url);
    onChange(url);
  };

  if (savedUrl) {
    return (
      <div ref={wrapRef} className="space-y-2">
        <img src={savedUrl} alt="Officer signature" className="h-32 w-full rounded border border-border bg-surface object-contain" />
        <button type="button" onClick={() => { setSavedUrl(undefined); onChange(undefined); setHasInk(false); }}
          className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent">
          Re-sign
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="space-y-2">
      <div
        className={`relative w-full rounded-md border-2 border-dashed ${invalid ? "border-destructive" : "border-border focus-within:border-primary hover:border-primary"} bg-surface`}
        style={{ height: 200 }}
      >
        <SignatureCanvas
          ref={ref}
          penColor="#111"
          canvasProps={{
            width: size.w,
            height: size.h,
            className: "h-[200px] w-full rounded-md",
            "aria-label": "Officer signature pad",
          }}
          onBegin={() => setHasInk(true)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={clear} className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
          Clear Signature
        </button>
        {hasInk && (
          <button type="button" onClick={save} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            Save Signature
          </button>
        )}
        {required && !savedUrl && <span className="self-center text-xs text-muted-foreground">Required to submit as Billable</span>}
      </div>
    </div>
  );
}
