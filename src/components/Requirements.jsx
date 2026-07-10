import React from 'react';
import { ArrowLeft, Info, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from './Common/Card';
import Button from './Common/Button';

const Requirements = () => {
  const navigate = useNavigate();

  const rules = [
    {
      title: 'Background',
      text: 'Must be a plain, uniform white or light grey background. No shadows, patterns, or objects behind you.',
      isOk: true,
    },
    {
      title: 'Lighting & Contrast',
      text: 'Bright, natural lighting. Avoid harsh shadows on the face, under the eyes, or behind the head.',
      isOk: true,
    },
    {
      title: 'Pose & Expression',
      text: 'Look straight at the camera. Neutral facial expression, mouth closed, both eyes open.',
      isOk: true,
    },
    {
      title: 'Glasses & Headwear',
      text: 'No glasses (even prescription). No hats, headbands, or heavy headwear unless for religious/medical reasons.',
      isOk: false,
    },
    {
      title: 'Photo Age',
      text: 'Must be taken within the last 6 months to reflect your current appearance.',
      isOk: true,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 no-print">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          icon={ArrowLeft}
          className="text-slate-400 hover:text-slate-200"
        >
          Back to Generator
        </Button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold font-display text-white mb-2">
          Passport Photo Guidelines
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Ensure your photos comply with international standards to prevent government application rejections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Do's card */}
        <Card className="border-emerald-500/10 bg-emerald-950/5">
          <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Official Do's
          </h3>
          <ul className="space-y-3.5 text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <span>Face the camera directly, centering your head in the frame.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <span>Keep your eyes open and looking straight at the lens.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <span>Ensure your clothing is in contrast with the white background (avoid white shirts).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <span>Remove any heavy hair fringes covering your eyes or face details.</span>
            </li>
          </ul>
        </Card>

        {/* Don'ts card */}
        <Card className="border-rose-500/10 bg-rose-950/5">
          <h3 className="text-lg font-bold text-rose-400 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Official Don'ts
          </h3>
          <ul className="space-y-3.5 text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
              <span>Do not smile, frown, grimace, or show teeth (neutral face only).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
              <span>Do not wear eyeglasses, sunglasses, or tinted lenses.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
              <span>Do not wear caps, hats, hoods, or non-religious head scarves.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
              <span>Do not submit photos with red-eye, pixelation, or camera glare.</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Rules list details */}
      <Card className="flex flex-col gap-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Technical Specifications Detailed
        </h3>
        <div className="divide-y divide-slate-800">
          {rules.map((rule, idx) => (
            <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
              <span className="font-semibold text-slate-200 sm:w-1/4 shrink-0 text-sm">{rule.title}</span>
              <p className="text-slate-400 text-sm flex-1">{rule.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Requirements;
