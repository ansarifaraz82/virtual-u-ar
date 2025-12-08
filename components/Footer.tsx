
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface FooterProps {
  isOnDressingScreen?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isOnDressingScreen = false }) => {
  return (
    <footer className="w-full bg-white/80 backdrop-blur-md border-t border-gray-200/60 p-4 mt-8 z-10 relative">
      <div className="mx-auto flex flex-col sm:flex-row items-center justify-center text-xs text-gray-600 max-w-7xl px-4">
        <p>
          Created by{' '}
          <span
            className="font-semibold text-gray-800"
          >
            Faraz Attarwala
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
