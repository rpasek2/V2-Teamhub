import { useReducer, useCallback } from 'react';
import type { GymnastProfile } from '../types';

// Form state structure - groups related fields together
export interface GymnastEditFormState {
    // Basic Info
    firstName: string;
    lastName: string;
    dob: string;
    gender: 'Male' | 'Female' | '';
    level: string;

    // Membership
    memberId: string;
    memberIdType: 'USAG' | 'AAU' | 'Other' | '';

    // Apparel
    tshirtSize: string;
    leoSize: string;

    // Guardian 1
    g1FirstName: string;
    g1LastName: string;
    g1Email: string;
    g1Phone: string;

    // Guardian 2
    g2FirstName: string;
    g2LastName: string;
    g2Email: string;
    g2Phone: string;

    // Emergency Contact 1
    ec1Name: string;
    ec1Phone: string;
    ec1Relationship: string;

    // Emergency Contact 2
    ec2Name: string;
    ec2Phone: string;
    ec2Relationship: string;

    // Medical
    allergies: string;
    medications: string;
    conditions: string;
    medicalNotes: string;
}

// Action types for the reducer
type FormAction =
    | { type: 'SET_FIELD'; field: keyof GymnastEditFormState; value: string }
    | { type: 'SET_BASIC'; data: Pick<GymnastEditFormState, 'firstName' | 'lastName' | 'dob' | 'gender' | 'level'> }
    | { type: 'SET_MEMBERSHIP'; data: Pick<GymnastEditFormState, 'memberId' | 'memberIdType'> }
    | { type: 'SET_APPAREL'; data: Pick<GymnastEditFormState, 'tshirtSize' | 'leoSize'> }
    | { type: 'SET_GUARDIANS'; data: Pick<GymnastEditFormState, 'g1FirstName' | 'g1LastName' | 'g1Email' | 'g1Phone' | 'g2FirstName' | 'g2LastName' | 'g2Email' | 'g2Phone'> }
    | { type: 'SET_EMERGENCY'; data: Pick<GymnastEditFormState, 'ec1Name' | 'ec1Phone' | 'ec1Relationship' | 'ec2Name' | 'ec2Phone' | 'ec2Relationship'> }
    | { type: 'SET_MEDICAL'; data: Pick<GymnastEditFormState, 'allergies' | 'medications' | 'conditions' | 'medicalNotes'> }
    | { type: 'RESET' };

// Initial state
const initialState: GymnastEditFormState = {
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    level: '',
    memberId: '',
    memberIdType: '',
    tshirtSize: '',
    leoSize: '',
    g1FirstName: '',
    g1LastName: '',
    g1Email: '',
    g1Phone: '',
    g2FirstName: '',
    g2LastName: '',
    g2Email: '',
    g2Phone: '',
    ec1Name: '',
    ec1Phone: '',
    ec1Relationship: '',
    ec2Name: '',
    ec2Phone: '',
    ec2Relationship: '',
    allergies: '',
    medications: '',
    conditions: '',
    medicalNotes: '',
};

// Reducer function
function formReducer(state: GymnastEditFormState, action: FormAction): GymnastEditFormState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'SET_BASIC':
            return { ...state, ...action.data };
        case 'SET_MEMBERSHIP':
            return { ...state, ...action.data };
        case 'SET_APPAREL':
            return { ...state, ...action.data };
        case 'SET_GUARDIANS':
            return { ...state, ...action.data };
        case 'SET_EMERGENCY':
            return { ...state, ...action.data };
        case 'SET_MEDICAL':
            return { ...state, ...action.data };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

export type EditSection = 'basic' | 'membership' | 'apparel' | 'guardians' | 'emergency' | 'medical' | null;

export function useGymnastEditForm() {
    const [formState, dispatch] = useReducer(formReducer, initialState);

    // Generic field setter
    const setField = useCallback((field: keyof GymnastEditFormState, value: string) => {
        dispatch({ type: 'SET_FIELD', field, value });
    }, []);

    // Load data from gymnast profile into form state for a specific section
    const loadSection = useCallback((section: EditSection, gymnast: GymnastProfile | null) => {
        if (!gymnast) return;

        switch (section) {
            case 'basic':
                dispatch({
                    type: 'SET_BASIC',
                    data: {
                        firstName: gymnast.first_name || '',
                        lastName: gymnast.last_name || '',
                        dob: gymnast.date_of_birth || '',
                        gender: (gymnast.gender as 'Male' | 'Female' | '') || '',
                        level: gymnast.level || '',
                    }
                });
                break;
            case 'membership':
                dispatch({
                    type: 'SET_MEMBERSHIP',
                    data: {
                        memberId: gymnast.member_id || '',
                        memberIdType: (gymnast.member_id_type as 'USAG' | 'AAU' | 'Other' | '') || '',
                    }
                });
                break;
            case 'apparel':
                dispatch({
                    type: 'SET_APPAREL',
                    data: {
                        tshirtSize: gymnast.tshirt_size || '',
                        leoSize: gymnast.leo_size || '',
                    }
                });
                break;
            case 'guardians':
                dispatch({
                    type: 'SET_GUARDIANS',
                    data: {
                        g1FirstName: gymnast.guardian_1?.first_name || '',
                        g1LastName: gymnast.guardian_1?.last_name || '',
                        g1Email: gymnast.guardian_1?.email || '',
                        g1Phone: gymnast.guardian_1?.phone || '',
                        g2FirstName: gymnast.guardian_2?.first_name || '',
                        g2LastName: gymnast.guardian_2?.last_name || '',
                        g2Email: gymnast.guardian_2?.email || '',
                        g2Phone: gymnast.guardian_2?.phone || '',
                    }
                });
                break;
            case 'emergency':
                dispatch({
                    type: 'SET_EMERGENCY',
                    data: {
                        ec1Name: gymnast.emergency_contact_1?.name || '',
                        ec1Phone: gymnast.emergency_contact_1?.phone || '',
                        ec1Relationship: gymnast.emergency_contact_1?.relationship || '',
                        ec2Name: gymnast.emergency_contact_2?.name || '',
                        ec2Phone: gymnast.emergency_contact_2?.phone || '',
                        ec2Relationship: gymnast.emergency_contact_2?.relationship || '',
                    }
                });
                break;
            case 'medical':
                dispatch({
                    type: 'SET_MEDICAL',
                    data: {
                        allergies: gymnast.medical_info?.allergies || '',
                        medications: gymnast.medical_info?.medications || '',
                        conditions: gymnast.medical_info?.conditions || '',
                        medicalNotes: gymnast.medical_info?.notes || '',
                    }
                });
                break;
        }
    }, []);

    // Get update data for a specific section
    const getUpdateData = useCallback((section: EditSection, gymnast: GymnastProfile | null): Record<string, unknown> => {
        switch (section) {
            case 'basic':
                return {
                    first_name: formState.firstName,
                    last_name: formState.lastName,
                    date_of_birth: formState.dob,
                    gender: formState.gender || null,
                    level: formState.level || null,
                };
            case 'membership':
                return {
                    member_id: formState.memberId || null,
                    member_id_type: formState.memberIdType || null,
                };
            case 'apparel':
                return {
                    tshirt_size: formState.tshirtSize || null,
                    leo_size: formState.leoSize || null,
                };
            case 'guardians':
                return {
                    guardian_1: {
                        first_name: formState.g1FirstName || null,
                        last_name: formState.g1LastName || null,
                        email: formState.g1Email || null,
                        phone: formState.g1Phone || null,
                    },
                    guardian_2: {
                        first_name: formState.g2FirstName || null,
                        last_name: formState.g2LastName || null,
                        email: formState.g2Email || null,
                        phone: formState.g2Phone || null,
                    },
                };
            case 'emergency':
                return {
                    emergency_contact_1: formState.ec1Name ? {
                        name: formState.ec1Name,
                        phone: formState.ec1Phone || null,
                        relationship: formState.ec1Relationship || null,
                    } : null,
                    emergency_contact_2: formState.ec2Name ? {
                        name: formState.ec2Name,
                        phone: formState.ec2Phone || null,
                        relationship: formState.ec2Relationship || null,
                    } : null,
                };
            case 'medical':
                return {
                    medical_info: {
                        ...gymnast?.medical_info,
                        allergies: formState.allergies || null,
                        medications: formState.medications || null,
                        conditions: formState.conditions || null,
                        notes: formState.medicalNotes || null,
                    },
                };
            default:
                return {};
        }
    }, [formState]);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    return {
        formState,
        setField,
        loadSection,
        getUpdateData,
        reset,
    };
}
