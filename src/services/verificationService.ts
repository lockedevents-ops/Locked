

export const verificationService = {
  /**
   * Resolve Bank Account Name
   * Used before adding a bank account payment method
   */
  async resolveBankAccount(bankCode: string, accountNumber: string): Promise<string | null> {
    try {
      const response = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bank', bankCode, accountNumber })
      });

      const data = await response.json();

      if (data.responseCode === '0000' && data.data?.name) {
        return data.data.name;
      }
      
      return null;
    } catch (error) {
      console.error('Bank verification error:', error);
      return null;
    }
  },

  /**
   * Verify Mobile Money Account
   * Used before adding a mobile money payment method
   */
  async resolveMobileMoney(provider: string, phoneNumber: string): Promise<string | null> {
    try {
      const response = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'momo', provider, phoneNumber })
      });

      const data = await response.json();

      if (data.responseCode === '0000' && data.data?.name) {
        return data.data.name;
      }
      
      return null;
    } catch (error) {
      console.error('Momo verification error:', error);
      return null;
    }
  },
  
  /**
   * Verify Ghana Card
   */
  async verifyGhanaCard(
    cardNumber: string, 
    surname: string, 
    firstnames: string, 
    gender: string, 
    dob: string
  ): Promise<{ isValid: boolean; score: string }> {
    try {
      const response = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'ghana_card', 
          ghanaCardNumber: cardNumber,
          surname,
          firstnames,
          gender,
          dateOfBirth: dob
        })
      });

      const data = await response.json();

      if (data.responseCode === '0000' && data.data?.isValid) {
        return { isValid: true, score: data.data.score };
      }
      
      return { isValid: false, score: '0%' };
    } catch (error) {
      console.error('Ghana Card verification error:', error);
      return { isValid: false, score: '0%' };
    }
  }
};
