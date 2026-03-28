import { useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import Toggle from '../components/ui/Toggle';

export default function ComponentTestPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [inputVal, setInputVal] = useState('');

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Component Test Page</h1>

      <Card title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </Card>

      <Card title="Badges">
        <div className="flex gap-3">
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </div>
      </Card>

      <Card title="Input">
        <Input
          label="Weight"
          unit="kg"
          placeholder="75.5"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
        />
        <div className="mt-3">
          <Input
            label="With Error"
            error="This field is required"
            value=""
            onChange={() => {}}
          />
        </div>
      </Card>

      <Card title="Select">
        <Select
          label="Day Type"
          options={[
            { value: 'normal', label: 'Normal Day' },
            { value: 'restaurant', label: 'Restaurant Day' },
          ]}
        />
      </Card>

      <Card title="Toggle">
        <Toggle
          label="Calorie Burning"
          checked={toggled}
          onChange={setToggled}
        />
        <p className="text-sm mt-2 text-gray-500">State: {toggled ? 'ON' : 'OFF'}</p>
      </Card>

      <Card title="Progress Bars">
        <div className="space-y-3">
          <ProgressBar value={75} colorScheme="success" label="Protein" showValue />
          <ProgressBar value={45} colorScheme="warning" label="Carbs" showValue />
          <ProgressBar value={90} colorScheme="danger" label="Fat" showValue />
        </div>
      </Card>

      <Card title="Spinners">
        <div className="flex gap-4 items-center">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </Card>

      <Card title="Skeletons">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Card>

      <Card title="Modal">
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Open Modal
        </Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Test Modal"
          footer={
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Close
            </Button>
          }
        >
          <p>Modal content goes here. Press Escape or click outside to close.</p>
        </Modal>
      </Card>
    </div>
  );
}
