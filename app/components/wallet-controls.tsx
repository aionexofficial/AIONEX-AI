"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
export function WalletControls() { return <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />; }
