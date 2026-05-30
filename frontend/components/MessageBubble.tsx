interface MessageBubbleProps {
  type: 'user' | 'gemini';
  text: string;
}

export default function MessageBubble({ type, text }: MessageBubbleProps) {
  if (type === 'gemini') {
    return (
      <div className="flex gap-3 max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-blue-400 font-medium mb-1">AI</p>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end max-w-[85%] ml-auto">
      <div className="bg-slate-800 rounded-2xl rounded-br-md px-4 py-2.5">
        <p className="text-xs text-blue-400 font-medium mb-0.5">You</p>
        <p className="text-slate-200 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
