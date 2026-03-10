import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, Edit, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Subject } from "@/types";

const SubjectsPage: React.FC = () => {
  const { subjects, addSubject, deleteSubject, editSubject } = useSubjects();
  const { toast } = useToast();
  const [search, setSearch] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);

  const [form, setForm] = useState<{
    courseCode:string;
    subjectCode: string;
    subjectName: string;
    academicYear: string;
    semester: number;
    regulation: string;
    courseType: "theory" | "lab" | "theory+lab";
    numberOfCOs: number;
  }>({
    courseCode:"",
    subjectCode: "",
    subjectName: "",
    academicYear: "2024-25",
    semester: 1,
    regulation: "R2021",
    courseType: "theory",
    numberOfCOs: 5,
  });

  const [editForm, setEditForm] = useState<{
    id: number;
    courseCode:string;
    subjectCode: string;
    subjectName: string;
    academicYear: string;
    semester: number;
    regulation: string;
    courseType: "theory" | "lab" | "theory+lab";
    numberOfCOs: number;
  }>({
    id: 0,
    courseCode:"",
    subjectCode: "",
    subjectName: "",
    academicYear: "2024-25",
    semester: 1,
    regulation: "R2020",
    courseType: "theory",
    numberOfCOs: 5,
  });

  const filtered = subjects.filter(
    (s) =>
      s.subjectCode
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      s.subjectName
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.courseCode || !form.subjectCode || !form.subjectName) {
      toast({
        title: "Validation Error",
        description: "Subject code and name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const subjectData = {
        courseCode:form.courseCode,
        subjectCode: form.subjectCode,
        subjectName: form.subjectName,
        academicYear: form.academicYear,
        semester: form.semester,
        regulation: form.regulation,
        courseType: form.courseType as "theory" | "lab" | "theory+lab",
        numberOfCOs: form.numberOfCOs,
      };

      await addSubject(subjectData);

      toast({
        title: "Subject Added",
        description: `${form.subjectCode} - ${form.subjectName} added successfully!`,
      });

      setDialogOpen(false);
      setForm({
        courseCode:"",
        subjectCode: "",
        subjectName: "",
        academicYear: "2024-25",
        semester: 1,
        regulation: "R2020",
        courseType: "theory",
        numberOfCOs: 5,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Add Subject",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const subject = subjects.find((s) => s.id === id);
    if (!subject) return;
    if (!confirm(`Delete ${subject.subjectCode}?`)) return;

    try {
      await deleteSubject(String(id));
      toast({
        title: "Subject Deleted",
        description: "Subject removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Delete",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEditOpen = (subject: Subject) => {
    setEditForm({
      id: subject.id,
      courseCode:subject.courseCode,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      academicYear: subject.academicYear,
      semester: subject.semester,
      regulation: subject.regulation,
      courseType: subject.courseType,
      numberOfCOs: subject.numberOfCOs,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.courseCode || !editForm.subjectCode || !editForm.subjectName) {
      toast({
        title: "Validation Error",
        description: "Subject code and name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { id, ...data } = editForm;
      await editSubject(id, data);

      toast({
        title: "Subject Updated",
        description: `${editForm.subjectCode} updated successfully!`,
      });

      setEditDialogOpen(false);
      setEditForm({
        id: 0,
        courseCode:"",
        subjectCode: "",
        subjectName: "",
        academicYear: "2024-25",
        semester: 1,
        regulation: "R2020",
        courseType: "theory",
        numberOfCOs: 5,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Update Subject",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout
      title="Subject Management"
      subtitle="Add and manage course subjects for CO‑PO computation"
    >
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-accent text-accent-foreground gap-2">
              <Plus className="w-4 h-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Course Code</Label>
                <Input
                  value={form.courseCode}
                  onChange={(e) =>
                    setForm({ ...form, courseCode: e.target.value })
                  }
                  placeholder="C101"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input
                  value={form.subjectCode}
                  onChange={(e) =>
                    setForm({ ...form, subjectCode: e.target.value })
                  }
                  placeholder="CS301"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input
                  value={form.subjectName}
                  onChange={(e) =>
                    setForm({ ...form, subjectName: e.target.value })
                  }
                  placeholder="Data Structures"
                />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select
                  value={form.academicYear}
                  onValueChange={(v) => setForm({ ...form, academicYear: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-25">2024–25</SelectItem>
                    <SelectItem value="2023-24">2023–24</SelectItem>
                    <SelectItem value="2022-23">2022–23</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select
                  value={String(form.semester)}
                  onValueChange={(v) =>
                    setForm({ ...form, semester: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Course Type</Label>
                <Select
                  value={form.courseType}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      courseType: v as "theory" | "lab" | "theory+lab",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="theory+lab">Theory + Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of COs</Label>
                <Select
                  value={String(form.numberOfCOs)}
                  onValueChange={(v) =>
                    setForm({ ...form, numberOfCOs: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} COs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regulation</Label>
                <Input
                  value={form.regulation}
                  onChange={(e) =>
                    setForm({ ...form, regulation: e.target.value })
                  }
                />
              </div>
            </div>
            <Button
              className="w-full mt-4 gradient-accent text-accent-foreground"
              onClick={handleAdd}
            >
              Add Subject
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Course Code</Label>
              <Input
                value={editForm.courseCode}
                onChange={(e) =>
                  setEditForm({ ...editForm, courseCode: e.target.value })
                }
                placeholder="C101"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Code</Label>
              <Input
                value={editForm.subjectCode}
                onChange={(e) =>
                  setEditForm({ ...editForm, subjectCode: e.target.value })
                }
                placeholder="CS301"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input
                value={editForm.subjectName}
                onChange={(e) =>
                  setEditForm({ ...editForm, subjectName: e.target.value })
                }
                placeholder="Data Structures"
              />
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select
                value={editForm.academicYear}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, academicYear: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-25">2024–25</SelectItem>
                  <SelectItem value="2023-24">2023–24</SelectItem>
                  <SelectItem value="2022-23">2022–23</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select
                value={String(editForm.semester)}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, semester: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Course Type</Label>
              <Select
                value={editForm.courseType}
                onValueChange={(v) =>
                  setEditForm({
                    ...editForm,
                    courseType: v as "theory" | "lab" | "theory+lab",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theory">Theory</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="theory+lab">Theory + Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of COs</Label>
              <Select
                value={String(editForm.numberOfCOs)}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, numberOfCOs: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} COs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Regulation</Label>
              <Input
                value={editForm.regulation}
                onChange={(e) =>
                  setEditForm({ ...editForm, regulation: e.target.value })
                }
              />
            </div>
          </div>
          <Button
            className="w-full mt-4 gradient-accent text-accent-foreground"
            onClick={handleEdit}
          >
            Update Subject
          </Button>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass-card hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded-md hover:bg-muted"
                      onClick={() => handleEditOpen(s)}
                    >
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-destructive/10"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-sm">{s.subjectCode}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {s.subjectName}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Sem {s.semester}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {s.academicYear}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent capitalize">
                    {s.courseType}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {s.numberOfCOs} COs
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No subjects found</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SubjectsPage;
