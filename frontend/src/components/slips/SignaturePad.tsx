import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface Props {
  initialUrl?: string;
  onChange: (dataUrl: string | undefined) => void;
  required?: boolean;
  invalid?: boolean;
}
