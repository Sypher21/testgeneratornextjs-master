"use client"

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue, } from '@/components/ui/select';
import { DataTable } from '@/components/questionTable';
import { ColumnDef } from "@tanstack/react-table"
import { UserButton } from '@clerk/nextjs';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Question = {
  thema: string;
  question: string
  level: number
}

type AvailableLevels = { 
    name: string,
    levels: number[], 
  };



const ExcelFileUploader: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<number>(0);
    const [numQuestions, setNumQuestions] = useState<number>(0);
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [availableLevels, setAvailableLevels] = useState<AvailableLevels[]>([]); // Neu: verfügbare Stufen
    const [question, setQuestion] = useState<Question[]>([]);

    const removeQuestion = (index: number) => {
      setQuestion((prevQs) => {
        const updatedQuestions = [...prevQs];
        updatedQuestions.splice(index, 1);
        return updatedQuestions;
      });
    };

    const columns: ColumnDef<Question>[] = [
      {
        accessorKey: "thema",
        header: "Thema",
      },
      {
        accessorKey: "question",
        header: "Frage",
      },
      {
        accessorKey: "level",
        header: "Stufe",
      },
      {
        header: 'Aktionen',
        accessorKey: 'actions',
        // Hier fügen wir eine benutzerdefinierte Zelle für die Aktionen hinzu.
        cell: ( rowIndex ) => (
          <Button onClick={() => removeQuestion(rowIndex.row.index)}>Löschen</Button>
        ),
      },
    ]
    

  // Effekt, um die verfügbaren Themen und Stufen beim Laden der Komponente abzurufen
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!selectedFile) {
          console.error('Keine Datei ausgewählt.');
          return;
        }

        const data = await readExcelFile(selectedFile);

        if (!data) {
          console.error('Fehler beim Lesen der Excel-Datei.');
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const topics = workbook.SheetNames;

        setAvailableTopics(topics);

        const levelsByTopicArray = topics.map((topic) => {
          const sheet = workbook.Sheets[topic];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 2 });
          const levels = Array.from(new Set(jsonData.map((row: any) => row['Stufe']))).map((level) => parseInt(level, 10));
          
          // Filter out NaN values
          const filteredLevels = levels.filter((level) => !isNaN(level));
          
          return { name: topic, levels: filteredLevels };
        });
        
        setAvailableLevels(levelsByTopicArray);
        
        console.log(availableLevels);
        
        
      } catch (error) {
        console.error('Fehler beim Lesen der Excel-Datei:', error);
      }
    };

    if (selectedFile) {
      fetchData();
    }
  }, [selectedFile]);


const readExcelFile = async (file: File): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target || !(event.target.result instanceof ArrayBuffer)) {
        reject(new Error('Fehler beim Lesen der Datei.'));
        return;
      }

      const arrayBuffer = event.target.result;
      const data = new Uint8Array(arrayBuffer);
      resolve(data);
    };

    reader.onerror = (event) => {
      reject(new Error('Fehler beim Lesen der Datei.'));
    };

    reader.readAsArrayBuffer(file);
  });
};



const handleAddQuestions = async () => {
  if (!selectedFile || !selectedSheet || !selectedLevel || numQuestions <= 0) {
    alert('Bitte wählen Sie eine Excel-Datei, ein Thema, eine Stufe und geben Sie die Anzahl der Fragen ein.');
    return;
  }

  // Read Excel file and select questions based on user input
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 2 });

    // Filter questions based on level
    const filteredQuestions = jsonData.filter((row: any) => row['Stufe'] === selectedLevel);
    console.log(filteredQuestions,2);

    // Jetzt enthält `filteredQuestions` alle Fragen mit der ausgewählten Stufe
    // Randomly select questions
    const selectedQs: string[] = []; // Hier geben wir an, dass selectedQuestions ein Array von Zeichenfolgen (strings) ist.
    
    let index: number = 1;

    while (selectedQs.length < numQuestions && filteredQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
      const selectedQuestion: string | undefined = (filteredQuestions.splice(randomIndex, 1)[0] as any)?.Frage as string;
      if (selectedQuestion) {
        selectedQs.push(selectedQuestion);
        console.log(selectedQuestion)
        console.log(selectedQs,1)
        setQuestion((prevQs) => [...prevQs, {thema: selectedSheet, question: selectedQuestion , level: selectedLevel}]);
        
      }
    }
    
  };
   // Read the Excel file content
   reader.readAsArrayBuffer(selectedFile);
    
  setNumQuestions(0);
  setSelectedSheet("");
  setSelectedLevel(0);
};
    
  const handleGenerateQuestions = async () => {
  
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: question.map((question: Question, index: number) => {
            
            return new Paragraph({
              children: [new TextRun(`${index + 1}: ${question.question}`)],
            });
          }),
        },
      ],
    });
    
    // Save the Word document and offer it for download
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, 'ausgewaehlte_fragen.docx');
};



return (
  <div className='vh-[100%] vw-[100%] flex flex-col gap-10 items-center justify-center'>
  <div className='flex w-[300px] justify-center items-center flex-col gap-5 '>
<Input type='file'
  onChange={(e) => {
    const selectedFile = e.target?.files?.[0] || null; 
    setSelectedFile(selectedFile);
  }}/>

      <Select
        value={selectedSheet}
        onValueChange={(e) => setSelectedSheet(e)}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Wähle ein Thema" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Thema</SelectLabel>
          {availableTopics.map((topic) => (
          <SelectItem  key={topic} value={topic}>
            {topic}
          </SelectItem >
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>

  
  <Select
        onValueChange={(e) => setSelectedLevel(parseInt(e))}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Wähle eine Stufe" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Level</SelectLabel>
          {availableLevels.map((topic) => {
            if (topic.name === selectedSheet) {
              return topic.levels.map((level) => (
              <SelectItem key={level} value={level.toString()}>
              {level}
            </SelectItem>
            ));
          }
          return null;
        })}
        </SelectGroup>
      </SelectContent>
    </Select>     


    <Input
      type="number"
      placeholder="Anzahl der Fragen"
      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
    />

    <Button onClick={handleAddQuestions}>Fragen hinzufügen</Button>
    
  </div>
    <div className='w-[100%] p-10 justify-center items-center'>
    <DataTable columns={columns} data={question}/>
    </div>
    <div className='pb-10'>
    <Button onClick={handleGenerateQuestions}>Fragen generieren</Button>
    </div>
  </div>
  );
};

export default ExcelFileUploader;
