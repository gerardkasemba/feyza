'use client';

import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { 
  Share2, Copy, CheckCircle, ExternalLink, 
  Twitter, Facebook, Linkedin, Link2,
  DollarSign, Users
} from 'lucide-react';

interface ShareBusinessCardProps {
  businessName: string;
  slug: string;
  tagline?: string;
  isApproved: boolean;
}

export function ShareBusinessCard({ businessName, slug, tagline, isApproved }: ShareBusinessCardProps) {
  const [copied, setCopied] = useState(false);
  
  const profileUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/lend/${slug}`
    : `/lend/${slug}`;
  
  // Updated share text that clearly states people can borrow money
  const shareText = `Need a loan? Borrow money from ${businessName} on Feyza! Fast approval, fair rates, no hidden fees. Apply now!`;
  
  // Hashtags for better reach
  const hashtags = '#BorrowMoney #PersonalLoan #FastCash #LoanApp #EmergencyFunds #Feyza';

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const fullText = `${shareText}\n\n${profileUrl}\n\n${hashtags}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`,
      '_blank'
    );
  };

  const shareToFacebook = () => {
    const fullText = `${shareText}\n\nApply here: ${profileUrl}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}&quote=${encodeURIComponent(fullText)}`,
      '_blank'
    );
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
      '_blank'
    );
  };

  if (!isApproved) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 p-4 text-green-700 dark:text-green-400">
          <Share2 className="w-5 h-5" />
          <div>
            <p className="font-semibold">Share Your Lending Profile</p>
            <p className="text-sm text-green-600 dark:text-green-300">Available after your business is approved</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-green-200 dark:border-green-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Share to Get Borrowers</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Let people know they can <span className="font-semibold text-green-600 dark:text-green-400">borrow money</span> from you
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Quick Share Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={shareToTwitter}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white transition-colors shadow-md hover:shadow-lg"
              title="Share on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </button>
            <button
              onClick={shareToFacebook}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#4267B2] hover:bg-[#365899] text-white transition-colors shadow-md hover:shadow-lg"
              title="Share on Facebook"
            >
              <Facebook className="w-5 h-5" />
            </button>
            <button
              onClick={shareToLinkedIn}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0077B5] hover:bg-[#006399] text-white transition-colors shadow-md hover:shadow-lg"
              title="Share on LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </button>
          </div>
          
          {/* Copy Link Button */}
          <Button
            variant="outline"
            onClick={copyLink}
            className="border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
          
          {/* View Profile */}
          <a href={profileUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Profile
            </Button>
          </a>
        </div>
      </div>
      
      {/* Share Message Preview */}
      <div className="mt-6 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3 mb-3">
          <Users className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
              Message people will see:
            </h4>
            <p className="text-neutral-600 dark:text-neutral-300">
              {shareText}
            </p>
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Hashtags: {hashtags}
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile URL */}
      <div className="mt-4 flex items-center gap-2 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <Link2 className="w-4 h-4 text-neutral-400" />
        <code className="text-sm text-neutral-600 dark:text-neutral-300 flex-1 truncate">
          {profileUrl}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyLink}
          className="h-8 px-2"
        >
          {copied ? '✓' : 'Copy'}
        </Button>
      </div>

      {/* Call to Action */}
      <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-800 dark:text-green-300 text-center">
          <strong>💡 Tip:</strong> Share regularly to reach people who need to borrow money!
        </p>
      </div>
    </Card>
  );
}