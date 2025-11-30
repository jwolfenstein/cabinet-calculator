import React, { useState } from 'react';

export default function ExampleFeature() {
  const [value, setValue] = useState('');
  return (
    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, background: '#f9f9f9', maxWidth: 320 }}>
      <h4 style={{ margin: '0 0 8px' }}>Example Feature</h4>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type something..."
        style={{ width: 180, padding: '4px 8px', borderRadius: 4, border: '1px solid #bbb' }}
      />
      <div style={{ marginTop: 8, color: '#888', fontSize: 14 }}>Current value: {value}</div>
    </div>
  );
}
