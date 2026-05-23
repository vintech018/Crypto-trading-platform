"use client";

import React, { useState, Children, ReactNode, HTMLAttributes } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

type StepperProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    initialStep?: number;
    onStepChange?: (step: number) => void;
    onFinalStepCompleted?: () => void;
    stepCircleContainerClassName?: string;
    stepContainerClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
    backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    backButtonText?: string;
    nextButtonText?: string;
    disableStepIndicators?: boolean;
    renderStepIndicator?: (props: {
        step: number;
        currentStep: number;
        onStepClick: (clicked: number) => void;
    }) => ReactNode;
}

export function Stepper({
    children,
    initialStep = 1,
    onStepChange = () => { },
    onFinalStepCompleted = () => { },
    stepCircleContainerClassName = '',
    stepContainerClassName = '',
    contentClassName = '',
    footerClassName = '',
    backButtonProps = {},
    nextButtonProps = {},
    backButtonText = 'Back',
    nextButtonText = 'Next',
    disableStepIndicators = false,
    renderStepIndicator,
    ...rest
}: StepperProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [direction, setDirection] = useState(0);
    const steps = Children.toArray(children);
    const totalSteps = steps.length;
    const isLastStep = currentStep === totalSteps;

    const goToStep = (step: number) => {
        const nextStep = Math.min(Math.max(step, 1), totalSteps);
        if (nextStep !== currentStep) {
            setDirection(nextStep > currentStep ? 1 : -1);
            setCurrentStep(nextStep);
            onStepChange(nextStep);
        }
    };

    const handleNext = () => {
        if (isLastStep) {
            onFinalStepCompleted();
        } else {
            goToStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        goToStep(currentStep - 1);
    };

    const variants: Variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '50%' : '-50%',
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? '50%' : '-50%',
            opacity: 0,
        }),
    };

    return (
        <div className={`flex flex-col ${stepContainerClassName}`} {...rest}>
            <div className={`flex items-center justify-between mb-12 ${stepCircleContainerClassName}`}>
                {steps.map((_, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = currentStep > stepNumber;
                    const isActive = currentStep === stepNumber;

                    return (
                        <React.Fragment key={stepNumber}>
                            {renderStepIndicator ? (
                                renderStepIndicator({
                                    step: stepNumber,
                                    currentStep,
                                    onStepClick: goToStep,
                                })
                            ) : (
                                <StepIndicator
                                    step={stepNumber}
                                    isCompleted={isCompleted}
                                    isActive={isActive}
                                    onClick={() => !disableStepIndicators && goToStep(stepNumber)}
                                />
                            )}
                            {index < totalSteps - 1 && (
                                <StepConnector isCompleted={isCompleted} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className={`relative overflow-hidden flex-1 ${contentClassName}`}>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="w-full"
                    >
                        {steps[currentStep - 1]}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className={`flex justify-between mt-12 ${footerClassName}`}>
                <button
                    type="button"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className={`px-6 py-2.5 text-sm font-semibold text-white bg-transparent border border-white/20 rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${backButtonProps.className || ''}`}
                    {...backButtonProps}
                >
                    {backButtonText}
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className={`px-6 py-2.5 text-sm font-semibold text-black bg-white rounded-full hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white transition-colors ${nextButtonProps.className || ''}`}
                    {...nextButtonProps}
                >
                    {isLastStep ? 'Start Trading' : nextButtonText}
                </button>
            </div>
        </div>
    );
}

export function Step({ children }: { children: ReactNode }) {
    return <div className="w-full">{children}</div>;
}

function StepIndicator({
    step,
    isCompleted,
    isActive,
    onClick,
}: {
    step: number;
    isCompleted: boolean;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 font-bold ${isCompleted
                    ? 'bg-white border-white text-black scale-100'
                    : isActive
                        ? 'border-white text-white bg-white/10 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                        : 'border-white/20 text-white/40 hover:border-white/40 scale-100 bg-transparent'
                }`}
        >
            {isCompleted ? (
                <CheckIcon className="w-6 h-6" />
            ) : (
                <span>{step}</span>
            )}
        </button>
    );
}

function StepConnector({ isCompleted }: { isCompleted: boolean }) {
    return (
        <div className="flex-1 h-[2px] mx-4 sm:mx-8 bg-white/10 relative overflow-hidden rounded-full">
            <motion.div
                initial={{ width: '0%' }}
                animate={{ width: isCompleted ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute top-0 left-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            />
        </div>
    );
}

type CheckIconProps = React.SVGProps<SVGSVGElement>;

function CheckIcon(props: CheckIconProps) {
    return (
        <svg
            {...props}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
        >
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                    delay: 0.1,
                    type: 'tween',
                    ease: 'easeOut',
                    duration: 0.3,
                }}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
            />
        </svg>
    );
}
