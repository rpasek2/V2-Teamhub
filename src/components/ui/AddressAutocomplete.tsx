import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    required?: boolean;
}

interface Suggestion {
    placeId: string;
    mainText: string;
    secondaryText: string;
    fullText: string;
}

// Track if script is loading to prevent duplicate loads
let scriptLoadingPromise: Promise<void> | null = null;

// Load Google Maps script dynamically with async loading
const loadGoogleMapsScript = (): Promise<void> => {
    // Return existing promise if already loading
    if (scriptLoadingPromise) {
        return scriptLoadingPromise;
    }

    scriptLoadingPromise = new Promise((resolve, reject) => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            reject(new Error('Google Maps API key not configured'));
            return;
        }

        // Check if already loaded
        if (window.google?.maps?.places?.AutocompleteSuggestion) {
            resolve();
            return;
        }

        // Check if script tag already exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            // Wait for it to load
            const checkLoaded = () => {
                if (window.google?.maps?.places?.AutocompleteSuggestion) {
                    resolve();
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            checkLoaded();
            return;
        }

        // Create callback function name
        const callbackName = `initGoogleMapsPlaces_${Date.now()}`;

        // Define callback
        (window as unknown as Record<string, () => void>)[callbackName] = () => {
            // Clean up callback
            delete (window as unknown as Record<string, () => void>)[callbackName];
            resolve();
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=${callbackName}`;
        script.async = true;
        script.onerror = () => {
            scriptLoadingPromise = null;
            reject(new Error('Failed to load Google Maps'));
        };
        document.head.appendChild(script);
    });

    return scriptLoadingPromise;
};

export function AddressAutocomplete({
    value,
    onChange,
    placeholder = 'Enter address or venue',
    className = '',
    id,
    required = false,
}: AddressAutocompleteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [apiLoaded, setApiLoaded] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load Google Maps API on mount
    useEffect(() => {
        loadGoogleMapsScript()
            .then(() => {
                // Create a session token for this component instance
                sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
                setApiLoaded(true);
            })
            .catch((err) => {
                console.error('Google Maps API error:', err);
                setApiError(err.message);
            });
    }, []);

    // Fetch suggestions using the new API
    const fetchSuggestions = useCallback(async (input: string) => {
        if (!apiLoaded || !input.trim()) {
            setSuggestions([]);
            return;
        }

        // Create new session token if needed
        if (!sessionTokenRef.current) {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }

        setLoading(true);

        try {
            const request = {
                input,
                sessionToken: sessionTokenRef.current,
                // Include both establishments and addresses
                includedPrimaryTypes: [] as string[], // Empty means all types
            };

            const response = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

            if (response.suggestions && response.suggestions.length > 0) {
                const formattedSuggestions: Suggestion[] = response.suggestions.map((suggestion) => {
                    const prediction = suggestion.placePrediction;
                    // Parse the text to get main and secondary parts
                    const fullText = prediction?.text?.text || '';
                    const parts = fullText.split(', ');
                    const mainText = parts[0] || fullText;
                    const secondaryText = parts.slice(1).join(', ');

                    return {
                        placeId: prediction?.placeId || '',
                        mainText,
                        secondaryText,
                        fullText,
                    };
                });

                setSuggestions(formattedSuggestions);
                setIsOpen(true);
            } else {
                setSuggestions([]);
            }
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [apiLoaded]);

    // Debounced input handler
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        setHighlightedIndex(-1);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        if (apiLoaded && newValue.length >= 3) {
            debounceTimer.current = setTimeout(() => {
                fetchSuggestions(newValue);
            }, 300);
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    // Handle suggestion selection
    const handleSelect = (suggestion: Suggestion) => {
        onChange(suggestion.fullText);
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        // Create new session token after selection (as per Google's recommendation)
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        inputRef.current?.blur();
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelect(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    return (
        <div className="relative">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    id={id}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setIsOpen(true);
                        }
                    }}
                    placeholder={placeholder}
                    required={required}
                    className={`input w-full pl-10 ${className}`}
                    autoComplete="off"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>

            {/* Error message if API not configured */}
            {apiError && (
                <p className="mt-1 text-xs text-amber-600">
                    Address autocomplete unavailable. You can still type manually.
                </p>
            )}

            {/* Suggestions dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-60 overflow-y-auto"
                >
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.placeId || index}
                            type="button"
                            onClick={() => handleSelect(suggestion)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                                index === highlightedIndex
                                    ? 'bg-brand-50'
                                    : 'hover:bg-slate-50'
                            }`}
                        >
                            <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                index === highlightedIndex ? 'text-brand-500' : 'text-slate-400'
                            }`} />
                            <div className="min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                    index === highlightedIndex ? 'text-brand-700' : 'text-slate-900'
                                }`}>
                                    {suggestion.mainText}
                                </p>
                                {suggestion.secondaryText && (
                                    <p className="text-xs text-slate-500 truncate">
                                        {suggestion.secondaryText}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))}
                    <div className="px-4 py-2 border-t border-slate-100">
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <img
                                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                                alt="Powered by Google"
                                className="h-3"
                            />
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
