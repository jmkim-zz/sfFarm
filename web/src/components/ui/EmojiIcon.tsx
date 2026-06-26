'use client';

import React from 'react';
import Image from 'next/image';

interface EmojiIconProps {
  emoji: string;
  size?: number;
  className?: string;
}

// OS 폰트(특히 Windows)에 종속되지 않고 항상 동일한 고해상도 이미지를 보여주기 위해
// 입력받은 이모지를 Twemoji(SVG) URL로 변환합니다.
function getTwemojiUrl(emoji: string): string {
  if (!emoji) return '';
  const codePoints = [];
  let i = 0;
  while (i < emoji.length) {
    const codePoint = emoji.codePointAt(i);
    if (codePoint) {
      codePoints.push(codePoint.toString(16));
      i += codePoint > 0xffff ? 2 : 1;
    } else {
      break;
    }
  }
  // 기본 이모지 변형 선택자(FE0F) 제거
  const hexName = codePoints.filter(c => c !== 'fe0f').join('-');
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${hexName}.svg`;
}

export default function EmojiIcon({ emoji, size = 24, className = '' }: EmojiIconProps) {
  const url = getTwemojiUrl(emoji);
  
  if (!url) {
    return <span className={className}>{emoji}</span>;
  }

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size, minWidth: size, minHeight: size }}>
      <img
        src={url}
        alt={emoji}
        width={size}
        height={size}
        className="w-full h-full object-contain filter drop-shadow-sm"
        onError={(e) => {
          // If Twemoji fails (e.g. invalid sequence), fallback to native font
          e.currentTarget.style.display = 'none';
          if (e.currentTarget.nextElementSibling) {
            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'inline';
          }
        }}
      />
      <span className="hidden leading-none" style={{ fontSize: size * 0.8 }}>{emoji}</span>
    </div>
  );
}
