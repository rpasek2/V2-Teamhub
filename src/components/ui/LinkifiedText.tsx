import { Fragment } from 'react';

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function isUrl(text: string): boolean {
    return /^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/i.test(text);
}

interface LinkifiedTextProps {
    text: string;
}

export function LinkifiedText({ text }: LinkifiedTextProps) {
    const parts = text.split(URL_REGEX);

    return (
        <>
            {parts.map((part, i) => {
                if (isUrl(part)) {
                    const href = part.startsWith('www.') ? `https://${part}` : part;
                    return (
                        <a
                            key={i}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-600 hover:underline break-all"
                        >
                            {part}
                        </a>
                    );
                }
                return <Fragment key={i}>{part}</Fragment>;
            })}
        </>
    );
}
