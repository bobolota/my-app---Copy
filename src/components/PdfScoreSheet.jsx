import React from 'react';

export default function PdfScoreSheet({ teamA, teamB, playersA, playersB, scoreA, scoreB }) {
  return (
    <div id="pdf-scoresheet-template" style={{ display: 'none', position: 'absolute', top: 0, left: 0, width: '800px', background: 'white', color: 'black', padding: '40px', fontFamily: 'sans-serif', zIndex: -100 }}>
        
      {/* EN-TÊTE DU PDF */}
      <div style={{ textAlign: 'center', borderBottom: '3px solid black', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', textTransform: 'uppercase' }}>Feuille de Marque Officielle</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
          <span style={{ flex: 1, textAlign: 'right' }}>{teamA?.name}</span>
          <span style={{ padding: '0 20px', fontSize: '24px', background: '#eee', borderRadius: '8px' }}>{scoreA} - {scoreB}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{teamB?.name}</span>
        </div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#555' }}>
          Match généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
        </div>
      </div>

      {/* TABLEAUX DES ÉQUIPES */}
      {[ 
        { name: teamA?.name, players: playersA, score: scoreA }, 
        { name: teamB?.name, players: playersB, score: scoreB } 
      ].map((teamData, index) => (
        <div key={index} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'black', color: 'white', padding: '10px', fontWeight: 'bold' }}>
            <span>ÉQUIPE {index === 0 ? 'A' : 'B'} : {teamData.name}</span>
            <span>TOTAL : {teamData.score} PTS</span>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid black', padding: '8px', width: '30px' }}>N°</th>
                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>NOM DU JOUEUR</th>
                <th style={{ border: '1px solid black', padding: '8px', width: '40px' }}>PTS</th>
                <th style={{ border: '1px solid black', padding: '8px', width: '80px' }}>FAUTES (1 à 5)</th>
                <th style={{ border: '1px solid black', padding: '8px', width: '40px' }}>3PT</th>
                <th style={{ border: '1px solid black', padding: '8px', width: '40px' }}>LF</th>
              </tr>
            </thead>
            <tbody>
              {teamData.players.map((p, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{p.number}</td>
                  <td style={{ border: '1px solid black', padding: '8px', textTransform: 'uppercase' }}>{p.name}</td>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{p.points}</td>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3px' }}>
                      {[0, 1, 2, 3, 4].map(fIdx => {
                        const foulLetter = (p.foulList && p.foulList[fIdx]) ? p.foulList[fIdx] : '';
                        return (
                          <div key={fIdx} style={{ width: '12px', height: '12px', border: '1px solid black', fontSize: '9px', lineHeight: '10px' }}>
                            {foulLetter}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>{p.fg3m}</td>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>{p.ftm}/{p.fta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ZONE DE SIGNATURE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '20px', borderTop: '2px dashed #aaa' }}>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <strong>Capitaine Équipe A</strong>
          <div style={{ borderBottom: '1px solid black', height: '50px', marginTop: '20px' }}></div>
        </div>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <strong>Officiel de Table (OTM)</strong>
          <div style={{ borderBottom: '1px solid black', height: '50px', marginTop: '20px' }}></div>
        </div>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <strong>Capitaine Équipe B</strong>
          <div style={{ borderBottom: '1px solid black', height: '50px', marginTop: '20px' }}></div>
        </div>
      </div>
      
    </div>
  );
}